import { Camera, Controls, MathUtils, MOUSE, OrthographicCamera, PerspectiveCamera, Quaternion, Vector2, Vector3 } from 'three';

interface TrackballControlsEventMap { change: {}; start: {}; end: {}; }

const _changeEvent = { type: 'change' as const };
const _startEvent = { type: 'start' as const };
const _endEvent = { type: 'end' as const };

const _EPS = 0.000001;
const _STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

const _v2 = new Vector2();
const _mouseChange = new Vector2();
const _objectUp = new Vector3();
const _pan = new Vector3();
const _axis = new Vector3();
const _quaternion = new Quaternion();
const _eyeDirection = new Vector3();
const _objectUpDirection = new Vector3();
const _objectSidewaysDirection = new Vector3();
const _moveDirection = new Vector3();

class TrackballControls extends Controls<TrackballControlsEventMap, Camera> {
	rotateSpeed = 1.0;
	zoomSpeed = 1.2;
	panSpeed = 0.3;
	noRotate = false;
	noZoom = false;
	noPan = false;
	staticMoving = false;
	dynamicDampingFactor = 0.2;
	minDistance = 0;
	maxDistance = Infinity;
	minZoom = 0;
	maxZoom = Infinity;
	keys: [string, string, string] = ['KeyA', 'KeyS', 'KeyD'];
	mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
	target = new Vector3();
	autoRotate = false;
	autoRotateSpeed = 2.0;

	state = _STATE.NONE;
	keyState = _STATE.NONE;

	_lastPosition = new Vector3();
	_lastZoom = 1;
	_touchZoomDistanceStart = 0;
	_touchZoomDistanceEnd = 0;
	_lastAngle = 0;
	_autoRotateAngle = 0;
	_eye = new Vector3();
	_movePrev = new Vector2();
	_moveCurr = new Vector2();
	_lastAxis = new Vector3();
	_zoomStart = new Vector2();
	_zoomEnd = new Vector2();
	_panStart = new Vector2();
	_panEnd = new Vector2();
	_pointers: PointerEvent[] = [];
	_pointerPositions: Record<number, Vector2> = {};

	_target0!: Vector3;
	_position0!: Vector3;
	_up0!: Vector3;
	_zoom0!: number;

	constructor(camera: Camera, domElement?: HTMLElement | SVGElement | null) {
		super(camera, domElement ?? null);

		this._target0 = this.target.clone();
		this._position0 = this.object.position.clone();
		this._up0 = this.object.up.clone();
		this._zoom0 = (this.object as PerspectiveCamera | OrthographicCamera).zoom;

		if(domElement !== null && domElement !== undefined) {
			this.connect(domElement);
		}

		this.update();
	}

	connect(element: HTMLElement | SVGElement) {
		super.connect(element);
		const el = this.domElement!;
		window.addEventListener('keydown', this._onKeyDown as EventListener);
		window.addEventListener('keyup', this._onKeyUp as EventListener);
		el.addEventListener('pointerdown', this._onPointerDown as EventListener);
		el.addEventListener('pointercancel', this._onPointerCancel as EventListener);
		el.addEventListener('wheel', this._onMouseWheel as EventListener, { passive: false });
		el.addEventListener('contextmenu', this._onContextMenu as EventListener);
		el.style.touchAction = 'none';
	}

	disconnect() {
		const el = this.domElement!;
		const doc = el.ownerDocument;
		window.removeEventListener('keydown', this._onKeyDown as EventListener);
		window.removeEventListener('keyup', this._onKeyUp as EventListener);
		el.removeEventListener('pointerdown', this._onPointerDown as EventListener);
		doc.removeEventListener('pointermove', this._onPointerMove as EventListener);
		doc.removeEventListener('pointerup', this._onPointerUp as EventListener);
		el.removeEventListener('pointercancel', this._onPointerCancel as EventListener);
		el.removeEventListener('wheel', this._onMouseWheel as EventListener);
		el.removeEventListener('contextmenu', this._onContextMenu as EventListener);
		el.style.touchAction = '';
	}

	dispose() {
		this.disconnect();
	}

	update(delta?: number) {
		const cam = this.object as PerspectiveCamera | OrthographicCamera;
		this._eye.subVectors(cam.position, this.target);

		// smooth auto-rotation
		const autoTarget = this.autoRotate && this.state === _STATE.NONE && this.keyState === _STATE.NONE
			? this.autoRotateSpeed * (delta ?? 1 / 60)
			: 0;
        // we could use dynamicDampingFactor here, but it looks a bit strange so we use a tuned factor instead
		this._autoRotateAngle += (autoTarget - this._autoRotateAngle) * 0.025;
		if(Math.abs(this._autoRotateAngle) > _EPS) {
			this._rotateCameraAuto();
		}

		if(!this.noRotate) this._rotateCamera();
		if(!this.noZoom) this._zoomCamera();
		if(!this.noPan) this._panCamera();

		cam.position.addVectors(this.target, this._eye);

		if(cam instanceof PerspectiveCamera) {
			this._checkDistances();
			cam.lookAt(this.target);

			if(this._lastPosition.distanceToSquared(cam.position) > _EPS) {
				this.dispatchEvent(_changeEvent);
				this._lastPosition.copy(cam.position);
			}
		} else if(cam instanceof OrthographicCamera) {
			cam.lookAt(this.target);

			if(this._lastPosition.distanceToSquared(cam.position) > _EPS || this._lastZoom !== cam.zoom) {
				this.dispatchEvent(_changeEvent);
				this._lastPosition.copy(cam.position);
				this._lastZoom = cam.zoom;
			}
		} else {
			console.warn('THREE.TrackballControls: Unsupported camera type.');
		}
	}

	reset() {
		const cam = this.object as PerspectiveCamera | OrthographicCamera;
		this.state = _STATE.NONE;
		this.keyState = _STATE.NONE;
		this.target.copy(this._target0);
		cam.position.copy(this._position0);
		cam.up.copy(this._up0);
		cam.zoom = this._zoom0;
		cam.updateProjectionMatrix();
		this._eye.subVectors(cam.position, this.target);
		cam.lookAt(this.target);
		this.dispatchEvent(_changeEvent);
		this._lastPosition.copy(cam.position);
		this._lastZoom = cam.zoom;
	}

	_panCamera() {
		const cam = this.object as PerspectiveCamera | OrthographicCamera;
		_mouseChange.copy(this._panEnd).sub(this._panStart);

		if(_mouseChange.lengthSq()) {
			if(cam instanceof OrthographicCamera) {
				const ortho = cam as OrthographicCamera;
				_mouseChange.x *= (ortho.right - ortho.left) / ortho.zoom;
				_mouseChange.y *= (ortho.top - ortho.bottom) / ortho.zoom;
			}

			_mouseChange.multiplyScalar(this.panSpeed);
			_pan.copy(this._eye).cross(cam.up).setLength(_mouseChange.x);
			_pan.add(_objectUp.copy(cam.up).setLength(_mouseChange.y));
			cam.position.add(_pan);
			this.target.add(_pan);

            this._panStart.copy(this._panEnd);
		}
	}

	_rotateCamera() {
		const cam = this.object as Camera;
		_moveDirection.set(this._moveCurr.x - this._movePrev.x, this._moveCurr.y - this._movePrev.y, 0);
		let angle = _moveDirection.length();

		if(angle) {
			this._eye.copy(cam.position).sub(this.target);
			_eyeDirection.copy(this._eye).normalize();
			_objectUpDirection.copy(cam.up).normalize();
			_objectSidewaysDirection.crossVectors(_objectUpDirection, _eyeDirection).normalize();
			_objectUpDirection.setLength(this._moveCurr.y - this._movePrev.y);
			_objectSidewaysDirection.setLength(this._moveCurr.x - this._movePrev.x);
			_moveDirection.copy(_objectUpDirection.add(_objectSidewaysDirection));
			_axis.crossVectors(_moveDirection, this._eye).normalize();
			angle *= this.rotateSpeed;
			_quaternion.setFromAxisAngle(_axis, angle);
			this._eye.applyQuaternion(_quaternion);
			cam.up.applyQuaternion(_quaternion);
			this._lastAxis.copy(_axis);
			this._lastAngle = angle;
		} else if(!this.staticMoving && this._lastAngle) {
			this._lastAngle *= Math.sqrt(1.0 - this.dynamicDampingFactor);
			this._eye.copy(cam.position).sub(this.target);
			_quaternion.setFromAxisAngle(this._lastAxis, this._lastAngle);
			this._eye.applyQuaternion(_quaternion);
			cam.up.applyQuaternion(_quaternion);
		}

		this._movePrev.copy(this._moveCurr);
	}

	_rotateCameraAuto() {
		const cam = this.object as Camera;
		this._eye.copy(cam.position).sub(this.target);
		_quaternion.setFromAxisAngle(cam.up, this._autoRotateAngle);
		this._eye.applyQuaternion(_quaternion);
		cam.position.addVectors(this.target, this._eye);
		cam.lookAt(this.target);
	}

	_zoomCamera() {
		const cam = this.object as PerspectiveCamera | OrthographicCamera;
		let factor: number;

		if(this.state === _STATE.TOUCH_ZOOM_PAN) {
			factor = this._touchZoomDistanceStart / this._touchZoomDistanceEnd;
			this._touchZoomDistanceStart = this._touchZoomDistanceEnd;

			if(cam instanceof PerspectiveCamera) {
				this._eye.multiplyScalar(factor);
			} else if(cam instanceof OrthographicCamera) {
				cam.zoom = MathUtils.clamp(cam.zoom / factor, this.minZoom, this.maxZoom);
				if(this._lastZoom !== cam.zoom) {
					cam.updateProjectionMatrix();
				}
			} else {
				console.warn('THREE.TrackballControls: Unsupported camera type');
			}
		} else {
			factor = 1.0 + (this._zoomEnd.y - this._zoomStart.y) * this.zoomSpeed;

			if(factor !== 1.0 && factor > 0.0) {
				if(cam instanceof PerspectiveCamera) {
					this._eye.multiplyScalar(factor);
				} else if(cam instanceof OrthographicCamera) {
					cam.zoom = MathUtils.clamp(cam.zoom / factor, this.minZoom, this.maxZoom);
					if(this._lastZoom !== cam.zoom) {
						cam.updateProjectionMatrix();
					}
				} else {
					console.warn('THREE.TrackballControls: Unsupported camera type');
				}
			}

			if(this.staticMoving) {
				this._zoomStart.copy(this._zoomEnd);
			} else {
				this._zoomStart.y += (this._zoomEnd.y - this._zoomStart.y) * this.dynamicDampingFactor;
			}
		}
	}

	_getMouseOnScreen(pageX: number, pageY: number) {
		const rect = this.domElement!.getBoundingClientRect();
		_v2.set(
			(pageX - rect.left - window.pageXOffset) / rect.width,
			(pageY - rect.top - window.pageYOffset) / rect.height
		);
		return _v2;
	}

	_getMouseOnCircle(pageX: number, pageY: number) {
		const cx = pageX - window.pageXOffset;
		const cy = pageY - window.pageYOffset;
		_v2.set(
			cx - window.innerWidth * 0.5,
			(window.innerHeight - 2 * cy) * 0.5
		);
		return _v2;
	}

	_addPointer(event: PointerEvent) {
		this._pointers.push(event);
	}

	_removePointer(event: PointerEvent) {
		delete this._pointerPositions[event.pointerId];
		for(let i = 0; i < this._pointers.length; i++) {
			if(this._pointers[i].pointerId == event.pointerId) {
				this._pointers.splice(i, 1);
				return;
			}
		}
	}

	_trackPointer(event: PointerEvent) {
		let position = this._pointerPositions[event.pointerId];
		if(position === undefined) {
			position = new Vector2();
			this._pointerPositions[event.pointerId] = position;
		}
		position.set(event.pageX, event.pageY);
	}

	_getSecondPointerPosition(event: PointerEvent) {
		const pointer = (event.pointerId === this._pointers[0].pointerId) ? this._pointers[1] : this._pointers[0];
		return this._pointerPositions[pointer.pointerId];
	}

	_checkDistances() {
		const cam = this.object as PerspectiveCamera;
		if(!this.noZoom || !this.noPan) {
			if(this._eye.lengthSq() > this.maxDistance * this.maxDistance) {
				cam.position.addVectors(this.target, this._eye.setLength(this.maxDistance));
				this._zoomStart.copy(this._zoomEnd);
			}
			if(this._eye.lengthSq() < this.minDistance * this.minDistance) {
				cam.position.addVectors(this.target, this._eye.setLength(this.minDistance));
				this._zoomStart.copy(this._zoomEnd);
			}
		}
	}

	_onPointerDown = (event: PointerEvent) => {
		if(!this.enabled) return;
		const el = this.domElement!;

		if(this._pointers.length === 0) {
			el.setPointerCapture(event.pointerId);
			el.ownerDocument.addEventListener('pointermove', this._onPointerMove as EventListener);
			el.ownerDocument.addEventListener('pointerup', this._onPointerUp as EventListener);
		}

		this._addPointer(event);

		if(event.pointerType === 'touch') {
			this._onTouchStart(event);
		} else {
			this._onMouseDown(event);
		}
	};

	_onPointerMove = (event: PointerEvent) => {
		if(!this.enabled) return;

		if(event.pointerType === 'touch') {
			this._onTouchMove(event);
		} else {
			this._onMouseMove(event);
		}
	};

	_onPointerUp = (event: PointerEvent) => {
		if(!this.enabled) return;

		if(event.pointerType === 'touch') {
			this._onTouchEnd(event);
		} else {
			this._onMouseUp();
		}

		this._removePointer(event);

		if(this._pointers.length === 0) {
			const el = this.domElement!;
			el.releasePointerCapture(event.pointerId);
			el.ownerDocument.removeEventListener('pointermove', this._onPointerMove as EventListener);
			el.ownerDocument.removeEventListener('pointerup', this._onPointerUp as EventListener);
		}
	};

	_onPointerCancel = (event: PointerEvent) => {
		this._removePointer(event);
	};

	_onKeyUp = () => {
		if(!this.enabled) return;
		this.keyState = _STATE.NONE;
		window.addEventListener('keydown', this._onKeyDown as EventListener);
	};

	_onKeyDown = (event: KeyboardEvent) => {
		if(!this.enabled) return;
		window.removeEventListener('keydown', this._onKeyDown as EventListener);

		if(this.keyState !== _STATE.NONE) return;

		if(event.code === this.keys[_STATE.ROTATE] && !this.noRotate) {
			this.keyState = _STATE.ROTATE;
		} else if(event.code === this.keys[_STATE.ZOOM] && !this.noZoom) {
			this.keyState = _STATE.ZOOM;
		} else if(event.code === this.keys[_STATE.PAN] && !this.noPan) {
			this.keyState = _STATE.PAN;
		}
	};

	_onMouseDown = (event: PointerEvent) => {
		let mouseAction: number;

		switch(event.button) {
			case 0: mouseAction = this.mouseButtons.LEFT; break;
			case 1: mouseAction = this.mouseButtons.MIDDLE; break;
			case 2: mouseAction = this.mouseButtons.RIGHT; break;
			default: mouseAction = -1;
		}

		switch(mouseAction) {
			case MOUSE.DOLLY: this.state = _STATE.ZOOM; break;
			case MOUSE.ROTATE: this.state = _STATE.ROTATE; break;
			case MOUSE.PAN: this.state = _STATE.PAN; break;
			default: this.state = _STATE.NONE;
		}

		const state = (this.keyState !== _STATE.NONE) ? this.keyState : this.state;

		if(state === _STATE.ROTATE && !this.noRotate) {
			this._moveCurr.copy(this._getMouseOnCircle(event.pageX, event.pageY));
			this._movePrev.copy(this._moveCurr);
		} else if(state === _STATE.ZOOM && !this.noZoom) {
			this._zoomStart.copy(this._getMouseOnScreen(event.pageX, event.pageY));
			this._zoomEnd.copy(this._zoomStart);
		} else if(state === _STATE.PAN && !this.noPan) {
			this._panStart.copy(this._getMouseOnScreen(event.pageX, event.pageY));
			this._panEnd.copy(this._panStart);
		}

		this.dispatchEvent(_startEvent);
	};

	_onMouseMove = (event: PointerEvent) => {
		const state = (this.keyState !== _STATE.NONE) ? this.keyState : this.state;

		if(state === _STATE.ROTATE && !this.noRotate) {
			this._movePrev.copy(this._moveCurr);
			this._moveCurr.copy(this._getMouseOnCircle(event.pageX, event.pageY));
		} else if(state === _STATE.ZOOM && !this.noZoom) {
			this._zoomEnd.copy(this._getMouseOnScreen(event.pageX, event.pageY));
		} else if(state === _STATE.PAN && !this.noPan) {
			this._panEnd.copy(this._getMouseOnScreen(event.pageX, event.pageY));
		}
	};

	_onMouseUp = () => {
		this.state = _STATE.NONE;
		this.dispatchEvent(_endEvent);
	};

	_onMouseWheel = (event: WheelEvent) => {
		if(!this.enabled || this.noZoom) return;
		event.preventDefault();

		switch(event.deltaMode) {
			case 2: this._zoomStart.y -= event.deltaY * 0.025; break;
			case 1: this._zoomStart.y -= event.deltaY * 0.01; break;
			default: this._zoomStart.y -= event.deltaY * 0.00025; break;
		}

		this.dispatchEvent(_startEvent);
		this.dispatchEvent(_endEvent);
	};

	_onContextMenu = (event: MouseEvent) => {
		if(!this.enabled) return;
		event.preventDefault();
	};

	_onTouchStart = (event: PointerEvent) => {
		this._trackPointer(event);

		switch(this._pointers.length) {
			case 1:
				this.state = _STATE.TOUCH_ROTATE;
				this._moveCurr.copy(this._getMouseOnCircle(this._pointers[0].pageX, this._pointers[0].pageY));
				this._movePrev.copy(this._moveCurr);
				break;
			default:
				this.state = _STATE.TOUCH_ZOOM_PAN;
				const dx = this._pointers[0].pageX - this._pointers[1].pageX;
				const dy = this._pointers[0].pageY - this._pointers[1].pageY;
				this._touchZoomDistanceEnd = this._touchZoomDistanceStart = Math.sqrt(dx * dx + dy * dy);
				const x = (this._pointers[0].pageX + this._pointers[1].pageX) / 2;
				const y = (this._pointers[0].pageY + this._pointers[1].pageY) / 2;
				this._panStart.copy(this._getMouseOnScreen(x, y));
				this._panEnd.copy(this._panStart);
				break;
		}

		this.dispatchEvent(_startEvent);
	};

	_onTouchMove = (event: PointerEvent) => {
		this._trackPointer(event);

		switch(this._pointers.length) {
			case 1:
				this._movePrev.copy(this._moveCurr);
				this._moveCurr.copy(this._getMouseOnCircle(event.pageX, event.pageY));
				break;
			default:
				const position = this._getSecondPointerPosition(event);
				const dx = event.pageX - position.x;
				const dy = event.pageY - position.y;
				this._touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy);
				const x = (event.pageX + position.x) / 2;
				const y = (event.pageY + position.y) / 2;
				this._panEnd.copy(this._getMouseOnScreen(x, y));
				break;
		}
	};

	_onTouchEnd = (event: PointerEvent) => {
		switch(this._pointers.length) {
			case 0:
				this.state = _STATE.NONE;
				break;
			case 1:
				this.state = _STATE.TOUCH_ROTATE;
				this._moveCurr.copy(this._getMouseOnCircle(event.pageX, event.pageY));
				this._movePrev.copy(this._moveCurr);
				break;
			case 2:
				this.state = _STATE.TOUCH_ZOOM_PAN;
				for(let i = 0; i < this._pointers.length; i++) {
					if(this._pointers[i].pointerId !== event.pointerId) {
						const position = this._pointerPositions[this._pointers[i].pointerId];
						this._moveCurr.copy(this._getMouseOnCircle(position.x, position.y));
						this._movePrev.copy(this._moveCurr);
						break;
					}
				}
				break;
		}

		this.dispatchEvent(_endEvent);
	};
}

export { TrackballControls };