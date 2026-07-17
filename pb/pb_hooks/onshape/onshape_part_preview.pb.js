// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

/**
 * @import { BTAssemblyDefinitionInfo, BTAssemblyInstanceInfo, AssemblyData, PartGroup, TransformMatrix4x4 } from "./part_types";
 */

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


routerAdd("POST", "/api/parts/generate_preview", (e) => {
    const auth = e.requestInfo().auth;
    if(!auth) throw new UnauthorizedError("Missing authentication");

    const body = e.requestInfo().body;
    if(typeof body !== "object" || !body.part_id) {
        throw new BadRequestError("Missing part_id in request body");
    }

    const partRecordId = body.part_id;
    let partRecord;
    try {
        partRecord = $app.findRecordById("parts", partRecordId);
        if(!partRecord) {
            throw new NotFoundError(`Part with id ${partRecordId} not found`);
        }
    } catch(err) {
        throw new NotFoundError(`Part with id ${partRecordId} not found`);
    }

    const lod = "coarse"; // coarse, medium, fine

    const did = partRecord.getString("document_id");
    const wvm = partRecord.getString("wvm");
    const wvmId = partRecord.getString("wvm_id");
    const eid = partRecord.getString("element_id");
    const partId = partRecord.getString("part_id");
    if(!did || !wvm || !wvmId || !eid || !partId) {
        throw new BadRequestError("Part record is missing required Onshape identifiers");
    }

    const { fileMode } = /** @type import("../util.js") */ (require(`${__hooks}/util.js`));
    
    // We save the result as a file under pb_data/preview_cache/{part_id}.json
    // make sure the directory exists
    const modelPath = `${__hooks}/../pb_data/_part_preview_models_temp`;
    try {
        $os.stat(modelPath);
    } catch {
        $os.mkdir(modelPath, fileMode.rwx);
    }

    const jsonPath = `${modelPath}/${partId}.json`;
    // if the file already exists, skip the request to onshape
    try {
        $os.stat(jsonPath);

        console.log(`Preview cache for part ${partId} already exists, skipping request to Onshape`);
    } catch {
        const url = `v16/parts/d/${did}/${wvm}/${wvmId}/e/${eid}/partid/${partId}/tessellatedfaces?rollbackBarIndex=-1&precomputedLevelOfDetail=${lod}&outputFaceAppearances=true&outputVertexNormals=true&outputFacetNormals=false&outputTextureCoordinates=false&outputIndexTable=true&outputErrorFaces=false&combineCompositePartConstituents=true`;
        console.log(`Requesting part preview from Onshape for part ${partId} at URL: ${url}`);
    
        const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));
        const res = onshapeRequest(auth, "GET", url);
        if(res.statusCode !== 200) {
            e.app.logger().error(`Failed to fetch part preview from Onshape for part ${partId}: ${res.statusCode} ${JSON.stringify(res.body)}`);
            throw new InternalServerError(`Failed to fetch part preview from Onshape: ${res.statusCode}`);
        }

        const data = res.body;
        $os.writeFile(jsonPath, JSON.stringify(data), fileMode.rw);
    }

    // convert the cached JSON to our binary format
    // since this is a potentially expensive operation, we run a separate node.js script to do the conversion
    // ...and v8 is a whole lot faster than the pb runtime
    const outputPath = `${modelPath}/${partId}.bin`;

    const cmd = $os.cmd("node", `${__hooks}/onshape/optimize_part.node.js`, jsonPath, outputPath);

    let result;
    try {
        result = cmd.output();
    } catch(err) {
        console.error("Error running optimize_part.node.js:", err);
        throw new InternalServerError("Failed to run part optimization script");
    }

    if(typeof result !== "string") {
        result = result.map(c => String.fromCharCode(c)).join("");
    }

    // make sure the output file exists
    try {
        $os.stat(outputPath);
    } catch {
        throw new InternalServerError("Part optimization script did not produce output file");
    }

    // upload to the record
    try {
        partRecord.set("preview_model", $filesystem.fileFromPath(outputPath));
        $app.save(partRecord);
    } catch(err) {
        console.error("Error setting preview_model on part record:", err);
        throw new InternalServerError("Failed to set preview_model on part record");
    }

    // delete the temporary files
    try {
        $os.remove(jsonPath);
        $os.remove(outputPath);
    } catch(err) {
        console.warn("Failed to delete temporary files:", err);
    }
    
    return e.json(200, { message: "Part preview generated successfully", result });
});