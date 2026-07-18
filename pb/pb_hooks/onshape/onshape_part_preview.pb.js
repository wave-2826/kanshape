// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

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

    const did = partRecord.getString("document_id");
    const wvm = partRecord.getString("wvm");
    const wvmId = partRecord.getString("wvm_id");
    const eid = partRecord.getString("element_id");
    const partId = partRecord.getString("part_id");
    const assembly = partRecord.getString("type") === "assembly";
    const configuration = partRecord.getString("configuration") || "default";
    if(!did || !wvm || !wvmId || !eid || (!assembly && !partId)) {
        throw new BadRequestError("Part record is missing required Onshape identifiers");
    }
    if(assembly && partId) {
        throw new BadRequestError("Assembly record should not have a part_id");
    }

    const { fileMode } = /** @type typeof import("../util.js") */ (require(`${__hooks}/util.js`));
    const { downloadAssemblyParts, downloadPartTessellation } = /** @type {typeof import("./onshape_part_preview")} */ (require(`${__hooks}/onshape/onshape_part_preview`));
    
    // We save the result as a file under pb_data/preview_cache/{part_id}.json
    // make sure the directory exists
    const modelPath = `${__hooks}/../pb_data/_part_preview_models_temp`;
    try {
        $os.stat(modelPath);
    } catch {
        $os.mkdir(modelPath, fileMode.rwx);
    }

    let jsonPath;
    if(assembly) {
        jsonPath = downloadAssemblyParts(e.app, modelPath, { did, wvm, wvmId, eid }, configuration, auth);
    } else {
        jsonPath = downloadPartTessellation(e.app, modelPath, { did, wvm, wvmId, eid, partId }, configuration, auth);
    }

    // convert the cached JSON to our binary format
    // since this is a potentially expensive operation, we run a separate node.js script to do the conversion
    // ...and v8 is a whole lot faster than the pb goja runtime
    const outputPath = `${modelPath}/${partId || did}.bin`;

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

    // delete all files in the temp directory that don't start with _ or . (just for testing)
    try {
        const files = $os.readDir(modelPath);
        for(const file of files) {
            if(!file.name().startsWith("_") && !file.name().startsWith(".")) {
                $os.remove(`${modelPath}/${file.name()}`);
            }
        }
    } catch(err) {
        console.warn("Failed to delete temporary files:", err);
    }
    
    return e.json(200, { message: "Part preview generated successfully", result });
});

// TODO: GC unreferenced parts?