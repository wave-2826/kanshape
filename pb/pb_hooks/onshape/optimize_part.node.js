// @ts-check
import fs from 'fs';
import { WriteStream } from 'fs';
import path from 'path';
/**
 * @import { BTExportTessellatedFacesResponse, AssemblyData, PartModelHeader, AssemblyModelHeader } from "./part_types";
 */

const PART_HEADER_MAGIC = "ONSH"; // onsh is for... onshape, i guess?
const ASSEMBLY_HEADER_MAGIC = "ONSA"; // onshape assembly... i guess

/** @param {string | string[]} value */
function decodeOnshapeColor(value) {
    // i believe the onshape schema is wrong that it can be string[], but we check it nonetheless
    if(Array.isArray(value)) value = value[0];
    const bytes = atob(value);
    const hex = (bytes.charCodeAt(0) << 16) | (bytes.charCodeAt(1) << 8) | bytes.charCodeAt(2);
    return hex;
}

/** @param {any} appearance */
function materialKey(appearance) {
    if(!appearance) return "default";
    return `${appearance.color}-${appearance.opacity ?? 255}`;
}

/**
 * encode 3D vector to 2*int8 octahedral normals
 * see 
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {{u: number, v: number}} u, v in [0, 255]
 */
function encodeOct8(x, y, z) {
    const inv = 1.0 / (Math.abs(x) + Math.abs(y) + Math.abs(z));

    let u = x * inv;
    let v = y * inv;
    if(z < 0) {
        const ou = u;
        u = (1 - Math.abs(v)) * (ou >= 0 ? 1 : -1);
        v = (1 - Math.abs(ou)) * (v >= 0 ? 1 : -1);
    }

    return {
        u: Math.round((u * 0.5 + 0.5) * 255),
        v: Math.round((v * 0.5 + 0.5) * 255),
    };
}

/**
 * Converts Onshape data to binary format and writes to the specified stream
 * @param {WriteStream} stream
 * @param {BTExportTessellatedFacesResponse} data
 * @returns {{
 *      centerTranslation: { x: number, y: number, z: number }
 * }}
 */
function writePartBinary(stream, data) {
    if(!data || !data.bodies || !data.facetPoints) {
        throw new Error("Invalid Onshape data: missing bodies or facetPoints");
    }

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

    let maxAbs = 0; // furthest point from the center in any axis for scaling
    let maxEuclideanSq = 0; // furthest point from the center in euclidean distance for camera distance
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
        maxEuclideanSq = Math.max(
            maxEuclideanSq,
            positions[i] * positions[i] + positions[i + 1] * positions[i + 1] + positions[i + 2] * positions[i + 2]
        );
    }

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const boundingBoxSize = Math.hypot(sizeX, sizeY, sizeZ);

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
    const quantizedNormals = new Uint8Array(normals.length / 3 * 2);
    for(let i = 0; i < normals.length; i += 3) {
        const nx = normals[i];
        const ny = normals[i + 1];
        const nz = normals[i + 2];
        const { u, v } = encodeOct8(nx, ny, nz);
        quantizedNormals[(i / 3) * 2] = u;
        quantizedNormals[(i / 3) * 2 + 1] = v;
    }

    // json header
    const materialsArray = Array.from(materialMap.values());
    const hasTransparent = materialsArray.some(m => m.transparent);
    /** @type {PartModelHeader} */
    const header = {
        version: 1,
        materials: Array.from(materialMap.values()),
        groups: materialGroups,
        hasTransparent,
        boundingBoxSize,
        decodeScale,
        vertexCount: positions.length / 3,
        hasNormals: normals.length > 0,
        maxDistance: Math.sqrt(maxEuclideanSq),
        pivot: { x: -centerX, y: -centerY, z: -centerZ }
    };

    let headerString = JSON.stringify(header);
    let headerByteLength = Buffer.byteLength(headerString, 'utf-8');
    
    // pad with spaces until the length is a multiple of 4 because javascript
    const padding = (4 - (headerByteLength % 4)) % 4;
    headerString += ' '.repeat(padding);
    
    const headerBuffer = Buffer.from(headerString, 'utf-8');

    // full payload
    const magic = Buffer.from(PART_HEADER_MAGIC, 'utf-8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(headerBuffer.length, 0);

    stream.write(magic);
    stream.write(lengthBuffer);
    stream.write(headerBuffer);
    stream.write(Buffer.from(quantizedPositions.buffer));
    stream.write(Buffer.from(quantizedNormals.buffer));

    console.log(`  Element: ${data.elementId}`)
    console.log("  - Header size:", headerBuffer.length, "bytes");
    console.log("  - Positions size:", quantizedPositions.byteLength, "bytes");
    console.log("  - Normals size:", quantizedNormals.byteLength, "bytes");
    console.log("  - Materials count:", materialsArray.length);
    console.log("  - Groups count:", materialGroups.length);

    return {
        centerTranslation: { x: centerX, y: centerY, z: centerZ }
    };
}

/**
 * Get the data of the given part file.
 * @param {string} dir The parent directory.
 * @param {string} file The name of the file.
 * @returns {BTExportTessellatedFacesResponse} content of the part file
 */
function getPartFile(dir, file) {
    const filePath = `${dir}/${file}`;
    if(!fs.existsSync(filePath)) {
        throw new Error(`Part file not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Encode a row-major 4x4 matrix representing a rigid transformation matrix as a
 * compact 7-number representation. Since Onshape only uses rigid transformations,
 * a full 4x4 matrix stores a lot of unnecessary data.
 * @param {WriteStream} stream
 * @param {number[]} transform
 * @param { { x: number, y: number, z: number } } centerTranslation Since we center parts,
 * we need to account for that shift when encoding positions.
 */
function encodeTransformation(stream, transform, centerTranslation) {
    if(!transform || transform.length !== 16) {
        throw new Error("Invalid transform matrix: must be a 4x4 matrix");
    }
    // if det(transform) !== 1, it's not a rigid transform. onshape should never output that
    // (and rightly doesn't allow setting instances to non-rigid trasnforms) but it's worth checking anyway
    const det = transform[0] * (transform[5] * transform[10] - transform[6] * transform[9]) -
                transform[1] * (transform[4] * transform[10] - transform[6] * transform[8]) +
                transform[2] * (transform[4] * transform[9]  - transform[5] * transform[8]);
    if(Math.abs(det - 1) > 1e-6) {
        throw new Error("Invalid transform matrix: must be a rigid transformation");
    }

    // encode translation as half precision f16 and write
    const tx = transform[3], ty = transform[7], tz = transform[11];
    const translationBuffer = Buffer.alloc(6);
    const tlbView = new DataView(translationBuffer.buffer);
    // we transform (x, y, z) -> (x, z, -y)
    tlbView.setFloat16(0, tx + centerTranslation.x, true);
    tlbView.setFloat16(2, tz + centerTranslation.y, true);
    tlbView.setFloat16(4, -ty + centerTranslation.z, true);
    stream.write(translationBuffer);

    // encode rotation as single precision quaternion
    // matrix
    const m00 = transform[0], m01 = transform[1], m02 = transform[2];
    const m10 = transform[4], m11 = transform[5], m12 = transform[6];
    const m20 = transform[8], m21 = transform[9], m22 = transform[10];

    // see https://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
    let qx, qy, qz, qw;

    const trace = m00 + m11 + m22;
    if(trace > 0) { 
        const s = Math.sqrt(trace+1.0) * 2; // S=4*qw 
        qw = 0.25 * s;
        qx = (m21 - m12) / s;
        qy = (m02 - m20) / s; 
        qz = (m10 - m01) / s; 
    } else if(m00 > m11 && m00 > m22) { 
        const s = Math.sqrt(1.0 + m00 - m11 - m22) * 2; // S=4*qx 
        qw = (m21 - m12) / s;
        qx = 0.25 * s;
        qy = (m01 + m10) / s; 
        qz = (m02 + m20) / s; 
    } else if(m11 > m22) { 
        const s = Math.sqrt(1.0 + m11 - m00 - m22) * 2; // S=4*qy
        qw = (m02 - m20) / s;
        qx = (m01 + m10) / s; 
        qy = 0.25 * s;
        qz = (m12 + m21) / s; 
    } else { 
        const s = Math.sqrt(1.0 + m22 - m00 - m11) * 2; // S=4*qz
        qw = (m10 - m01) / s;
        qx = (m02 + m20) / s;
        qy = (m12 + m21) / s;
        qz = 0.25 * s;
    }

    // normalize and write half-precision quaternion
    const invNorm = Math.hypot(qw, qx, qy, qz);
    qw *= invNorm; qx *= invNorm; qy *= invNorm; qz *= invNorm;

    const quaternionBuffer = Buffer.alloc(8);
    const dataView = new DataView(quaternionBuffer.buffer);
    dataView.setFloat16(0, qw, true);
    dataView.setFloat16(2, qx, true);
    dataView.setFloat16(4, qy, true);
    dataView.setFloat16(6, qz, true);
    stream.write(quaternionBuffer);
}

/**
 * Write a binary assembly file for the given Onshape assembly data.  
 * Finds all of the parts in the document and reads their respective files from their hashed path.  
 * All hashed part json files should be the direct response from Onshape
 * @param {WriteStream} stream
 * @param {string} inputFile
 * @param {AssemblyData} data
 */
function writeAssemblyBinary(stream, inputFile, data) {
    if(!data || !data.parts) {
        throw new Error("Invalid Onshape assembly data: missing parts");
    }

    // json header
    /** @type {AssemblyModelHeader} */
    const header = {
        version: 1,
        parts: data.parts.map(part => ({
            // the rest of the data is in individual parts
            count: part.transformations.length
        }))
    };

    let headerString = JSON.stringify(header);
    let headerByteLength = Buffer.byteLength(headerString, 'utf-8');
    
    // pad with spaces until the length is a multiple of 4 because javascript
    const padding = (4 - (headerByteLength % 4)) % 4;
    headerString += ' '.repeat(padding);
    
    const headerBuffer = Buffer.from(headerString, 'utf-8');

    // full payload
    const magic = Buffer.from(ASSEMBLY_HEADER_MAGIC, 'utf-8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(headerBuffer.length, 0);

    stream.write(magic);
    stream.write(lengthBuffer);
    stream.write(headerBuffer);

    console.log(`Assembly: ${inputFile}`)
    console.log("- Header size:", headerBuffer.length, "bytes");
    console.log("- Part count:", data.parts.length);

    // Write each individual part as:
    // - normal part data
    // - transformations (encoded)
    const directory = path.dirname(inputFile);
    for(const part of data.parts) {
        if(!part.file) throw new Error(`Part ${part.partId} is missing file reference`);
        const partData = getPartFile(directory, part.file);
        const { centerTranslation } = writePartBinary(stream, partData);

        // write transformations
        for(const transform of part.transformations) {
            encodeTransformation(stream, transform, centerTranslation);
        }
    }
}

// entrypoint
if(process.argv.length < 4) {
    console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <input.json> <output.bin>`);
    process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

/** @type {BTExportTessellatedFacesResponse | AssemblyData} */
const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
// btType
if("btType" in inputData && inputData["btType"].startsWith("BTExportTessellatedFacesResponse")) {
    console.log("Detected part input");
    console.log("Input size:", fs.statSync(inputPath).size, "bytes");
    writePartBinary(fs.createWriteStream(outputPath), inputData);
} else if("type" in inputData && inputData["type"] === "assembly") {
    console.log("Detected assembly input");
    writeAssemblyBinary(fs.createWriteStream(outputPath), inputPath, inputData);
} else {
    console.error("Unknown input data type. Expected BTExportTessellatedFacesResponse or BTAssemblyDefinitionInfo.");
}