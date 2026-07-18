// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

/**
 * @import { BTAssemblyDefinitionInfo, BTAssemblyInstanceInfo, AssemblyData, PartGroup, TransformMatrix4x4 } from "./part_types";
 */

// 1 api request per part is harsh, so we limit the number of unique parts for now
const MAX_ASSEMBLY_PARTS = 20;

/**
 * Extract the parts from an Onshape assembly data structure.
 * @param {BTAssemblyDefinitionInfo} onshapeData
 * @returns {AssemblyData}
 */
function extractAssemblyParts(onshapeData) {
    const instanceMap = new Map();
    
    /** @param {BTAssemblyInstanceInfo[]} instances */
    function indexInstances(instances) {
        for(const inst of instances) {
            instanceMap.set(inst.id, {
                type: inst.type,
                partId: inst.partId,
                documentId: inst.documentId,
                elementId: inst.elementId,
                documentMicroversion: inst.documentMicroversion,
                configuration: inst.configuration || inst.fullConfiguration || "default"
            });
        }
    }
    
    // index root assembly instances
    if(onshapeData.rootAssembly && onshapeData.rootAssembly.instances) {
        indexInstances(onshapeData.rootAssembly.instances);
    }
    
    // index sub-assembly instances
    if(onshapeData.subAssemblies) {
        for(const subAss of onshapeData.subAssemblies) {
            if(subAss.instances) {
                indexInstances(subAss.instances);
            }
        }
    }
    
    // process occurrences and group
    /** @type {Record<string, PartGroup>} */
    const partsGrouped = {};
    
    if(onshapeData.rootAssembly && onshapeData.rootAssembly.occurrences) {
        for(const occ of onshapeData.rootAssembly.occurrences) {
            // ignore hidden parts
            if(occ.hidden) continue;
            
            const path = occ.path;
            if(!path || path.length === 0) continue;
            
            // the leaf is the last ID in the path
            const leafId = path[path.length - 1];
            const instanceMeta = instanceMap.get(leafId);
            
            // we only care about instances of type 'Part'. I don't know what else you can even insert tbh
            if(instanceMeta && instanceMeta.type === "Part") {
                const { documentId, elementId, documentMicroversion, partId, configuration } = instanceMeta;
                
                const groupKey = `${documentId}_${elementId}_${documentMicroversion}_${partId}_${configuration}`;
                if(!partsGrouped[groupKey]) {
                    partsGrouped[groupKey] = {
                        documentId,
                        elementId,
                        documentMicroversion,
                        partId,
                        configuration,
                        transformations: []
                    };
                }
                
                // add this occurrence's transform matrix to the part's list
                if(occ.transform) {
                    if(occ.transform.length !== 16) continue; // invalid transform, skip
                    partsGrouped[groupKey].transformations.push(/** @type {TransformMatrix4x4} */(occ.transform));
                }
            }
        }
    }
    
    return {
        type: "assembly",
        parts: Object.values(partsGrouped)
    };
}

/**
 * Hashes a part's path to create a unique filename for its preview data.
 * @param {{
 *   did: string;
 *   wvm: string;
 *   wvmId: string;
 *   eid: string;
 *   partId?: string;
 * }} path
 */
function hashPart(path) {
    const { did, wvm, wvmId, eid, partId } = path;
    const str = `${did}_${wvm}_${wvmId}_${eid}_${partId ?? ""}`;
    return $security.md5(str);
}

/**
 * Download a part's tessellation data from Onshape.  
 * The output path is based on a hash of the part's path
 * @param {core.App} app 
 * @param {string} modelPath the path to place the output JSON file 
 * @param {{
 *   did: string;
 *   wvm: string;
 *   wvmId: string;
 *   eid: string;
 *   partId: string;
 *   linkDocumentId?: string;
 * }} path
 * @param {string} configuration the part's configuration, or "default" if none
 * @param {core.Record} authRecord 
 * @returns {string} the path to the downloaded JSON file
 */
function downloadPartTessellation(app, modelPath, path, configuration, authRecord) {
    const { fileMode } = /** @type typeof import("../util.js") */ (require(`${__hooks}/util.js`));
    const { did, wvm, wvmId, eid, partId, linkDocumentId } = path;
    if(!did || !wvm || !wvmId || !eid || !partId.trim()) {
        throw new BadRequestError("Missing required Onshape identifiers for part");
    }

    const lod = "medium"; // coarse, medium, fine

    const jsonPath = `${modelPath}/${hashPart(path)}.json`;
    // if the file already exists, skip the request to onshape
    try {
        $os.stat(jsonPath);

        console.log(`Preview cache for part ${partId} already exists, skipping request to Onshape`);
    } catch {
        const { URLSearchParams } = /** @type {typeof import("../url.js")} */ (require(`${__hooks}/url.js`));
        const params = new URLSearchParams();
        params.set("rollbackBarIndex", "-1");
        params.set("precomputedLevelOfDetail", lod);
        params.set("outputFaceAppearances", "true");
        params.set("outputVertexNormals", "true");
        params.set("outputFacetNormals", "false");
        params.set("outputTextureCoordinates", "false");
        params.set("outputIndexTable", "true");
        params.set("outputErrorFaces", "false");
        params.set("combineCompositePartConstituents", "true");
        if(configuration && configuration !== "default") {
            params.set("configuration", configuration);
        }
        if(linkDocumentId) {
            params.set("linkDocumentId", linkDocumentId);
        }
        const url = `v16/parts/d/${did}/${wvm}/${wvmId}/e/${eid}/partid/${partId}/tessellatedfaces?${params.toString()}`;
        console.log(`Requesting part preview from Onshape for part ${partId} at URL: ${url}`);
    
        const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));
        const res = onshapeRequest(authRecord, "GET", url);
        if(res.statusCode !== 200) {
            app.logger().error(`Failed to fetch part preview from Onshape for part ${partId}: ${res.statusCode} ${JSON.stringify(res.body)}`);
            throw new InternalServerError(`Failed to fetch part preview from Onshape: ${res.statusCode}`);
        }

        const data = res.body;
        $os.writeFile(jsonPath, JSON.stringify(data), fileMode.rw);
    }

    return jsonPath;
}

/**
 * Download an assembly's data as well the tessellations of any parts in it and save the
 * parsed data to a JSON file.
 * @param {core.App} app 
 * @param {string} modelPath the path to place the output JSON file
 * @param {{
 *   did: string;
 *   wvm: string;
 *   wvmId: string;
 *   eid: string;
 * }} path
 * @param {string} configuration the assembly's configuration, or "default" if none
 * @param {core.Record} authRecord 
 * @returns {string} the path to the downloaded JSON file
 */
function downloadAssemblyParts(app, modelPath, path, configuration, authRecord) {
    const { fileMode } = /** @type typeof import("../util.js") */ (require(`${__hooks}/util.js`));
    if(!path || !path.did || !path.wvm || !path.wvmId || !path.eid) {
        throw new BadRequestError("Missing required Onshape identifiers for assembly");
    }

    const { did, wvm, wvmId, eid } = path;

    const jsonPath = `${modelPath}/${hashPart(path)}.json`;
    // if the file already exists, skip the request to onshape
    try {
        $os.stat(jsonPath);

        console.log(`Preview cache for assembly ${eid} already exists, skipping request to Onshape`);
    } catch {
        const { URLSearchParams } = /** @type {typeof import("../url.js")} */ (require(`${__hooks}/url.js`));
        const params = new URLSearchParams();
        params.set("includeMateFeatures", "false");
        params.set("includeNonSolids", "false");
        params.set("includeMateConnectors", "false");
        params.set("excludeSuppressed", "true");
        if(configuration && configuration !== "default") {
            params.set("configuration", configuration);
        }
        const url = `v16/assemblies/d/${did}/${wvm}/${wvmId}/e/${eid}?${params.toString()}`;
        console.log(`Requesting assembly data from Onshape for assembly ${eid} at URL: ${url}`);
    
        const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));
        const res = onshapeRequest(authRecord, "GET", url);
        if(res.statusCode !== 200) {
            app.logger().error(`Failed to fetch assembly data from Onshape for assembly ${eid}: ${res.statusCode} ${JSON.stringify(res.body)}`);
            throw new InternalServerError(`Failed to fetch assembly data from Onshape: ${res.statusCode}`);
        }

        const data = res.body;
        const assemblyData = extractAssemblyParts(data);

        if(assemblyData.parts.length > MAX_ASSEMBLY_PARTS) {
            throw new BadRequestError(`Assembly has too many unique parts (${assemblyData.parts.length}), maximum allowed is ${MAX_ASSEMBLY_PARTS}`);
        }

        // download tessellation data for each part in the assembly
        for(const part of assemblyData.parts) {
            if(part.partId.trim().length === 0) {
                throw new BadRequestError(`Part in assembly is missing partId`);
            }

            const partPath = {
                did: part.documentId,
                // i don't know if this is the right handling for wvm data
                wvm: part.documentMicroversion ? "m" : wvm,
                wvmId: part.documentMicroversion || wvmId,
                eid: part.elementId,
                partId: part.partId,
                linkDocumentId: did
            };
            const file = downloadPartTessellation(app, modelPath, partPath, part.configuration, authRecord);
            part.file = file.replace(`${modelPath}/`, ""); // store relative path to the file
        }

        $os.writeFile(jsonPath, JSON.stringify(assemblyData), fileMode.rw);
    }

    return jsonPath;
}

module.exports = {
    downloadPartTessellation,
    downloadAssemblyParts
};