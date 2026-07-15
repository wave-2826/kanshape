// @ts-nocheck
import fs from 'fs';

function decodeOnshapeColor(value) {
    const bytes = atob(value);
    const hex = (bytes.charCodeAt(0) << 16) | (bytes.charCodeAt(1) << 8) | bytes.charCodeAt(2);
    return hex;
}

function materialKey(appearance) {
    if(!appearance) return "default";
    return `${appearance.color}-${appearance.opacity ?? 255}`;
}

/** encode 3D vector to 2*int8 octahedral normals */
function encodeOct8(x, y, z) {
    const inv = 1.0 / (Math.abs(x) + Math.abs(y) + Math.abs(z));

    let u = x * inv;
    let v = y * inv;
    if(z < 0) {
        const ou = u;
        u = (1 - Math.abs(v)) * Math.sign(ou);
        v = (1 - Math.abs(ou)) * Math.sign(v);
    }

    return {
        u: Math.round((u * 0.5 + 0.5) * 255),
        v: Math.round((v * 0.5 + 0.5) * 255),
    };
}

function convertOnshapeToBinary(data, outputPath) {
    const positions = [];
    const normals = [];
    const materialGroups = [];
    const materialMap = new Map();
    let currentMaterial = null;
    let materialStart = 0;
    
    materialMap.set("default", {
        color: decodeOnshapeColor(data.bodies[0].appearance.color),
        opacity: data.bodies[0].appearance.opacity / 255,
        transparent: data.bodies[0].appearance.opacity < 255
    });

    // bounds for centering
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    // unroll data and apply rotation
    for(const body of data.bodies) {
        for(const face of body.faces) {
            const key = materialKey(face.appearance);
            
            if(key !== currentMaterial && currentMaterial !== null) {
                materialGroups.push({
                    start: materialStart,
                    count: (positions.length / 3) - materialStart,
                    materialIndex: Array.from(materialMap.keys()).indexOf(currentMaterial)
                });
                materialStart = positions.length / 3;
            }

            if(!materialMap.has(key)) {
                materialMap.set(key, {
                    color: decodeOnshapeColor(face.appearance.color),
                    opacity: face.appearance.opacity / 255,
                    transparent: face.appearance.opacity < 255
                });
            }

            currentMaterial = key;

            for(const facet of face.facets) {
                // rotateX(-Math.PI / 2) can be turned into (x, y, z) -> (x, z, -y)
                const pts = [
                    data.facetPoints[facet.indices[0]],
                    data.facetPoints[facet.indices[1]],
                    data.facetPoints[facet.indices[2]]
                ];

                for(const p of pts) {
                    const x = p.x;
                    const y = p.z;
                    const z = -p.y;

                    positions.push(x, y, z);

                    // Update bounds
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
                }

                for(const n of facet.normals) {
                    const nx = n.x;
                    const ny = n.z;
                    const nz = -n.y;
                    
                    normals.push(nx, ny, nz);
                }
            }
        }
    }

    if(currentMaterial !== null) {
        materialGroups.push({
            start: materialStart,
            count: (positions.length / 3) - materialStart,
            materialIndex: Array.from(materialMap.keys()).indexOf(currentMaterial)
        });
    }

    // center the geometry
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    let maxAbs = 0; // furthest point from the center for scaling
    for(let i = 0; i < positions.length; i += 3) {
        positions[i] -= centerX;
        positions[i + 1] -= centerY;
        positions[i + 2] -= centerZ;

        maxAbs = Math.max(
            maxAbs, 
            Math.abs(positions[i]), 
            Math.abs(positions[i + 1]), 
            Math.abs(positions[i + 2])
        );
    }

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const boundingBoxSize = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ);

    // quantize positions to int16 (-32768 to 32767)
    // we map the max distance to 32767 to use the full integer range
    // i didn't think this would provide enough precision but haven't seen any issues
    const encodeScale = 32767 / maxAbs;
    const decodeScale = maxAbs / 32767; 
    
    const quantizedPositions = new Int16Array(positions.length);
    for(let i = 0; i < positions.length; i++) {
        quantizedPositions[i] = Math.round(positions[i] * encodeScale);
    }

    // quantize normals to 2*int8 (-128 to 127) since they don't need as much precision
    // since naive quantization of normals leads to artifacts, we use octahedral encoding
    const quantizedNormals = new Int8Array(normals.length / 3 * 2);
    for(let i = 0; i < normals.length; i += 3) {
        const nx = normals[i];
        const ny = normals[i + 1];
        const nz = normals[i + 2];
        const { u, v } = encodeOct8(nx, ny, nz);
        quantizedNormals[(i / 3) * 2] = u - 128; // shift to signed range
        quantizedNormals[(i / 3) * 2 + 1] = v - 128; // shift to signed range
    }

    // json header
    const materialsArray = Array.from(materialMap.values());
    const hasTransparent = materialsArray.some(m => m.transparent);
    const header = {
        materials: Array.from(materialMap.values()),
        groups: materialGroups,
        hasTransparent: Array.from(materialMap.values()).some(m => m.transparent),
        boundingBoxSize,
        decodeScale,
        vertexCount: positions.length / 3,
        hasNormals: normals.length > 0
    };

    let headerString = JSON.stringify(header);
    let headerByteLength = Buffer.byteLength(headerString, 'utf-8');
    
    // pad with spaces until the length is a multiple of 4 because javascript
    const padding = (4 - (headerByteLength % 4)) % 4;
    headerString += ' '.repeat(padding);
    
    const headerBuffer = Buffer.from(headerString, 'utf-8');

    // full payload
    const magic = Buffer.from("ONSH", 'utf-8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(headerBuffer.length, 0);

    const finalFile = Buffer.concat([
        magic, 
        lengthBuffer, 
        headerBuffer, 
        Buffer.from(quantizedPositions.buffer),
        Buffer.from(quantizedNormals.buffer)
    ]);

    console.log("Final file size:", finalFile.length, "bytes");
    console.log("- Header size:", headerBuffer.length, "bytes");
    console.log("- Positions size:", quantizedPositions.byteLength, "bytes");
    console.log("- Normals size:", quantizedNormals.byteLength, "bytes");
    console.log("- Materials count:", materialsArray.length);
    console.log("- Groups count:", materialGroups.length);

    fs.writeFileSync(outputPath, finalFile);
}

// entrypoint
if(process.argv.length < 4) {
    console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <input.json> <output.bin>`);
    process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
console.log("Input size:", fs.statSync(inputPath).size, "bytes");
convertOnshapeToBinary(inputData, outputPath);