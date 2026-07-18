<script lang="ts">
    import type { TypedPartsResponse } from "$lib/data/parts";
    import { client } from "$lib/pocketbase";
    import { loadScene } from "./renderer";

    const {
        part,
        stats: showStats = false
    }: {
        part: TypedPartsResponse;
        stats?: boolean
    } = $props();
    let canvas: HTMLCanvasElement | null = $state(null);

    let fileUrl = $derived(part.preview_model ? client.files.getURL(part, part.preview_model) : null);
    
    // lazy load three.js to avoid increasing the initial bundle size
    const THREE = await import("three");
    const { TrackballControls } = await import("./CustomTrackballControls");
    const Stats = (await import("three/examples/jsm/libs/stats.module.js")).default;

    $effect(() => {
        if(!canvas || !fileUrl) return;
        
        try {
            const scene = new THREE.Scene();
        
            const frustumSize = 1.3;
            const aspect = canvas.clientWidth / canvas.clientHeight;
            const camera = new THREE.OrthographicCamera(
                frustumSize * aspect / -2, frustumSize * aspect / 2,
                frustumSize / 2, frustumSize / -2,
                0.001, 1000
            );

            let stats = showStats ? new Stats() : null;
            if(stats) {
                canvas.parentElement?.appendChild(stats.dom);
            }
        
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: "high-performance",
                canvas,
                alpha: true
            });
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
        
            const controls = new TrackballControls(camera, renderer.domElement);
            // controls.enableDamping = true;
            // // auto-rotate camera if reduce motion is not enabled
            // controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            // controls.autoRotateSpeed = 1.5;
            controls.staticMoving = false;
            controls.dynamicDampingFactor = 0.25;
            controls.rotateSpeed = 0.01;
            controls.panSpeed = 1.0;
            controls.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            };
            // controls.noPan = true;
            controls.target.set(0, 0, 0);
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.02;
        
            loadScene(THREE, scene, camera, fileUrl);
            
            const resizeObserver = new ResizeObserver(() => {
                const aspect = canvas!.clientWidth / canvas!.clientHeight;
                camera.left = frustumSize * aspect / -2;
                camera.right = frustumSize * aspect / 2;
                camera.top = frustumSize / 2;
                camera.bottom = frustumSize / -2;
                camera.updateProjectionMatrix();
        
                renderer.setSize(canvas!.clientWidth, canvas!.clientHeight);
            });
            resizeObserver.observe(canvas);

            let lastTime = performance.now();

            const intersectionObserver = new IntersectionObserver((entries) => {
                for(const entry of entries) {
                    if(entry.target === canvas) {
                        if(entry.isIntersecting) {
                            renderer.setAnimationLoop((time) => {
                                const delta = Math.min((time - lastTime) / 1000, 0.1);
                                controls.update(delta);
                                renderer.render(scene, camera);
                                if(stats) stats.update();
                            });
                        } else {
                            renderer.setAnimationLoop(null);
                        }
                    }
                }
            }, { threshold: 0.1 });
            intersectionObserver.observe(canvas);

            return () => {
                resizeObserver.disconnect();
                intersectionObserver.disconnect();
                renderer.setAnimationLoop(null);
                renderer.dispose();
            };
        } catch(e) {
            console.error("Error loading part preview:", e);
        }
    });
</script>

{#if part.preview_model}
    <!-- {fileUrl} -->
    <canvas bind:this={canvas}></canvas>
{/if}

<style lang="scss">
canvas {
    // don't expand based on the canvas's width/height attributes, which are used for the renderer's resolution
    width: 100% !important;
    height: 100% !important;
    display: block;
}
</style>