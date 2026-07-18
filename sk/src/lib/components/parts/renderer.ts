// definitely something...
// we lazy-load three, so these are just types
import type * as THREE from "three";
type THREE = typeof import("three");

export type PartModelHeader = {
    /** backward-compatible version */
    version?: 1;
    vertexCount: number;
    hasNormals: boolean;
    hasTransparent: boolean;
    decodeScale: number;
    boundingBoxSize: number;
    groups: { start: number; count: number; materialIndex: number }[];
    materials: { color: string; opacity: number; transparent: boolean }[];
    maxDistance?: number; // next version: make required
    pivot?: { x: number; y: number; z: number }; // next version: make required
};

export type AssemblyModelHeader = {
    /** backward-compatible version */
    version?: 1;
    parts: {
        count: number;
    }[];
    maxDistance?: number; // next version: make required
};

/** decode 2*int8 octahedral normals to 3D vector */
function decodeOct8(u8: number, v8: number) {
    let x = u8 / 255 * 2 - 1;
    let y = v8 / 255 * 2 - 1;
    let z = 1 - Math.abs(x) - Math.abs(y);
    if(z < 0) {
        const ox = x;
        x = (1 - Math.abs(y)) * Math.sign(ox);
        y = (1 - Math.abs(ox)) * Math.sign(y);
    }

    const invLen = 1 / Math.sqrt(x * x + y * y + z * z);
    return {
        x: x * invLen,
        y: y * invLen,
        z: z * invLen,
    };
}

export async function loadOnshapeModel(THREE: THREE, buffer: Uint8Array) {
    const magicString = new TextDecoder().decode(buffer.subarray(0, 4));
    if(magicString !== "ONSH") throw new Error("Invalid part model format");

    const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const jsonLength = dataView.getUint32(4, true);
    const jsonString = new TextDecoder().decode(buffer.subarray(8, 8 + jsonLength));
    const header = JSON.parse(jsonString) as PartModelHeader;

    const binaryOffset = 8 + jsonLength;
    const floatCount = header.vertexCount * 3;
    
    const int16Positions = new Int16Array(buffer.buffer, buffer.byteOffset + binaryOffset, floatCount);
    const decodedPositions = new Float32Array(floatCount);
    
    for(let i = 0; i < floatCount; i++) decodedPositions[i] = int16Positions[i] * header.decodeScale;

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(decodedPositions, 3));
    
    if(header.hasNormals) {
        // decode 2*int8 octahedral normals
        const uint8Normals = new Uint8Array(buffer.buffer, buffer.byteOffset + binaryOffset + floatCount * 2, header.vertexCount * 2);
        const decodedNormals = new Float32Array(floatCount);
        for(let i = 0; i < header.vertexCount * 2; i += 2) {
            const normal = decodeOct8(uint8Normals[i], uint8Normals[i + 1]);
            decodedNormals[i * 3 / 2] = normal.x;
            decodedNormals[i * 3 / 2 + 1] = normal.y;
            decodedNormals[i * 3 / 2 + 2] = normal.z;
        }
        geometry.setAttribute('normal', new THREE.BufferAttribute(decodedNormals, 3));
    } else {
        geometry.computeVertexNormals();
    }

    for(const group of header.groups) geometry.addGroup(group.start, group.count, group.materialIndex);

    const materials = header.materials.map(matData =>
        // use `new MeshWorldNormalMaterial({ side: THREE.FrontSide })` for testing normals
        new THREE.MeshStandardMaterial({
            color: new THREE.Color(matData.color),
            opacity: matData.opacity,
            transparent: matData.transparent,
            depthWrite: !matData.transparent,
            side: header.hasTransparent ? THREE.DoubleSide : THREE.FrontSide,
            
            metalness: 0.0,
            roughness: 0.5
        })
    );
    // materials.forEach(mat => mat.updateMeshOnBeforeRender(mesh));

    const length = 8 + jsonLength + floatCount * 2 + (header.hasNormals ? header.vertexCount * 2 : 0);
    return {
        geometry, materials,
        cameraDistance: header.maxDistance || header.boundingBoxSize,
        length,
        pivot: header.pivot
    };
}

function createEdgeOverlay(THREE: THREE, geometry: THREE.BufferGeometry) {
    // threshold in degrees (??)
    const edges = new THREE.EdgesGeometry(geometry, 40);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    return line;
}

function decodePosition(buffer: Uint8Array) {
    const dataView = new DataView(buffer.buffer, buffer.byteOffset, 14);
    const tx = dataView.getFloat16(0, true);
    const ty = dataView.getFloat16(2, true);
    const tz = dataView.getFloat16(4, true);

    const qw = dataView.getFloat16(6, true);
    const qx = dataView.getFloat16(8, true);
    const qy = dataView.getFloat16(10, true);
    const qz = dataView.getFloat16(12, true);

    return { tx, ty, tz, qx, qy, qz, qw, length: 14 };
}

async function loadModel(THREE: THREE, url: string, scene: THREE.Scene) {
    const response = await fetch(url);
    const buffer = new Uint8Array(await response.arrayBuffer());

    const magicString = new TextDecoder().decode(buffer.subarray(0, 4));
    if(magicString === "ONSH") {
        // part model
        const { geometry, materials, cameraDistance } = await loadOnshapeModel(THREE, buffer);
        const mesh = new THREE.Mesh(geometry, materials);
        scene.add(mesh);
        mesh.add(createEdgeOverlay(THREE, mesh.geometry));

        return { cameraDistance };
    } else if(magicString === "ONSA") {
        // assembly model
        const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const jsonLength = dataView.getUint32(4, true);
        const jsonString = new TextDecoder().decode(buffer.subarray(8, 8 + jsonLength));
        const header = JSON.parse(jsonString) as AssemblyModelHeader;

        let pos = 8 + jsonLength;
        for(const { count } of header.parts) {
            const partBuffer = buffer.subarray(pos);
            const { geometry, materials, pivot, length } = await loadOnshapeModel(THREE, partBuffer);
            pos += length;

            if(count > 10) {
                // use instancing
                const edges = createEdgeOverlay(THREE, geometry);
                const instancedMesh = new THREE.InstancedMesh(geometry, materials, count);
                for(let i = 0; i < count; i++) {
                    const { tx, ty, tz, qx, qy, qz, qw, length: posLength } = decodePosition(buffer.subarray(pos));
                    pos += posLength;

                    const matrix = new THREE.Matrix4();
                    matrix.compose(
                        new THREE.Vector3(tx + (pivot?.x ?? 0), ty + (pivot?.y ?? 0), tz + (pivot?.z ?? 0)),
                        new THREE.Quaternion(qx, qy, qz, qw),
                        new THREE.Vector3(1, 1, 1)
                    );
                    matrix.multiply(new THREE.Matrix4().makeTranslation(-(pivot?.x ?? 0), -(pivot?.y ?? 0), -(pivot?.z ?? 0)));
                    instancedMesh.setMatrixAt(i, matrix);
                    
                    // sad
                    const edgeInstance = edges.clone();
                    edgeInstance.applyMatrix4(matrix);
                    scene.add(edgeInstance);
                }
                scene.add(instancedMesh);
            } else {
                // use individual meshes
                const mesh = new THREE.Mesh(geometry, materials);
                if(pivot) mesh.pivot = new THREE.Vector3(pivot.x, pivot.y, pivot.z);
                mesh.add(createEdgeOverlay(THREE, mesh.geometry));
                for(let i = 0; i < count; i++) {
                    const { tx, ty, tz, qx, qy, qz, qw, length: posLength } = decodePosition(buffer.subarray(pos));
                    pos += posLength;

                    const instance = mesh.clone();
                    instance.position.set(tx, ty, tz);
                    instance.quaternion.set(qx, qy, qz, qw);
                    scene.add(instance);
                }
            }
        }

        // if header["aabb"] exists, add a box helper to visualize the bounding box
        // @ts-ignore
        if(header["aabb"]) {
            // @ts-ignore
            const { minX, minY, minZ, maxX, maxY, maxZ } = header["aabb"];
            const box = new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ));
            const boxHelper = new THREE.Box3Helper(box, 0xffff00);
            scene.add(boxHelper);
        }

        // if header["aabbs"] exists, draw individual instance aabbs
        // @ts-ignore
        if(header["aabbs"]) {
            // @ts-ignore
            for(const aabb of header["aabbs"]) {
                const { minX, minY, minZ, maxX, maxY, maxZ } = aabb;
                const box = new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ));
                const boxHelper = new THREE.Box3Helper(box, 0x00ff00);
                scene.add(boxHelper);
            }
        }

        // we're generally okay with zooming in on assemblies a little more
        return { cameraDistance: (header.maxDistance ?? 1) / 1.1 };
    } else {
        throw new Error("Invalid model format");
    }
}

export async function loadScene(THREE: THREE, scene: THREE.Scene, camera: THREE.OrthographicCamera, url: string) {
    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const { cameraDistance: size } = await loadModel(THREE, url, scene);

    // onshape does lights by connecting them to the camera; replicate that
    const directional = new THREE.DirectionalLight(0xffffff, 1.5);
    directional.position.set(0, 1, 1);
    directional.target.position.set(0, 0, 0);
    camera.add(directional);

    // const d = 10 / Math.sqrt(3);
    camera.position.set(size * 10, 0, 0);
    camera.up.set(0, 0, 1);
    camera.near = size / 10;
    camera.far = size * 20;
    camera.zoom = 1 / size / 2;
    camera.updateProjectionMatrix();
    scene.add(camera);

    // debugging origin sphere
    // const originSphere = new THREE.Mesh(
    //     new THREE.SphereGeometry(size / 100, 16, 16),
    //     new THREE.MeshBasicMaterial({ color: 0xff0000 })
    // );
    // scene.add(originSphere);
}