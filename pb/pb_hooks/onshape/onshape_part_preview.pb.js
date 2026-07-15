/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/parts/generate_preview", (e) => {
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

    // We save the result as a file under pb_data/preview_cache/{part_id}.json
    // make sure the directory exists
    const modelPath = `${__hooks}/../pb_data/_part_preview_models_temp`;
    try {
        $os.stat(modelPath);
    } catch {
        const mode = 0o755; // rwxr-xr-x
        $os.mkdir(modelPath, mode);
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
        const res = onshapeRequest(e.requestInfo().auth, "GET", url);
        if(res.statusCode !== 200) {
            e.app.logger().error(`Failed to fetch part preview from Onshape for part ${partId}: ${res.statusCode} ${JSON.stringify(res.body)}`);
            throw new InternalServerError(`Failed to fetch part preview from Onshape: ${res.statusCode}`);
        }

        const data = res.body;
        $os.writeFile(jsonPath, JSON.stringify(data), 0o644);
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