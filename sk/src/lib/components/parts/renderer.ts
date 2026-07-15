// definitely something...
// we lazy-load three, so these are just types
import type * as THREE from "three";
type THREE = typeof import("three");

type ModelHeader = {
    vertexCount: number;
    hasNormals: boolean;
    hasTransparent: boolean;
    decodeScale: number;
    boundingBoxSize: number;
    groups: { start: number; count: number; materialIndex: number }[];
    materials: { color: string; opacity: number; transparent: boolean }[];
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

export async function loadOnshapeModel(THREE: THREE, url: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    const dataView = new DataView(buffer);
    const magicString = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
    if(magicString !== "ONSH") throw new Error("Invalid model format");

    const jsonLength = dataView.getUint32(4, true);
    const jsonString = new TextDecoder().decode(new Uint8Array(buffer, 8, jsonLength));
    const header = JSON.parse(jsonString) as ModelHeader;

    const binaryOffset = 8 + jsonLength;
    const floatCount = header.vertexCount * 3;
    
    const int16Positions = new Int16Array(buffer, binaryOffset, floatCount);
    const decodedPositions = new Float32Array(floatCount);
    
    for(let i = 0; i < floatCount; i++) decodedPositions[i] = int16Positions[i] * header.decodeScale;

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(decodedPositions, 3));
    
    if(header.hasNormals) {
        // decode 2*int8 octahedral normals
        const int8Normals = new Int8Array(buffer, binaryOffset + floatCount * 2, header.vertexCount * 2);
        const decodedNormals = new Float32Array(floatCount);
        for(let i = 0; i < header.vertexCount * 2; i += 2) {
            const normal = decodeOct8(int8Normals[i] + 128, int8Normals[i + 1] + 128);
            decodedNormals[i * 3 / 2] = normal.x;
            decodedNormals[i * 3 / 2 + 1] = normal.y;
            decodedNormals[i * 3 / 2 + 2] = normal.z;
        }
        geometry.setAttribute('normal', new THREE.BufferAttribute(decodedNormals, 3));
    } else {
        geometry.computeVertexNormals();
    }

    for(const group of header.groups) geometry.addGroup(group.start, group.count, group.materialIndex);

    const materials = header.materials.map(matData => new THREE.MeshStandardMaterial({
        color: new THREE.Color(matData.color),
        opacity: matData.opacity,
        transparent: matData.transparent,
        depthWrite: !matData.transparent,
        side: header.hasTransparent ? THREE.DoubleSide : THREE.FrontSide
    }));

    const mesh = new THREE.Mesh(geometry, materials);

    return { mesh, cameraDistance: header.boundingBoxSize };
}

export function createEdgeOverlay(THREE: THREE, mesh: THREE.Mesh) {
    // threshold in degrees (??)
    const edges = new THREE.EdgesGeometry(mesh.geometry, 40);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    return line;
}

export async function loadScene(THREE: THREE, scene: THREE.Scene, camera: THREE.OrthographicCamera, url: string) {
    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const { mesh, cameraDistance: size } = await loadOnshapeModel(THREE, url);
    scene.add(mesh);
    mesh.add(createEdgeOverlay(THREE, mesh));

    // onshape does lights by connecting them to the camera; replicate that
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.target.position.set(0, 0, 0);
    directional.position.set(0, 0, 0);
    camera.add(directional);

    camera.position.set(size / Math.sqrt(3), size / Math.sqrt(3), size / Math.sqrt(3));
    camera.near = size / 1000;
    camera.far = size * 100;
    camera.zoom = 1 / size;
    camera.updateProjectionMatrix();
    scene.add(camera);
}