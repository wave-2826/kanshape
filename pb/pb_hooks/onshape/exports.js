// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

const EXPORT_QUEUE_COLLECTION = "export_queue";

/**
 * @import {_schemas, DeepPartial, PartHeuristicsResult} from "./part_types";
 */
/**
 * @typedef {import("../../../sk/src/lib/data/parts").PartExportType} ExportType
 */

/**
 * map our export types to Onshape format names and file formats
 * @type {Record<ExportType, { onshape: string, extension: string }>}
 */
const EXPORT_FORMAT_MAP = {
    dxf: { onshape: "DXF", extension: ".dxf" },
    step: { onshape: "STEP", extension: ".step" },
    gltf: { onshape: "GLTF", extension: ".gltf" },
    obj: { onshape: "OBJ", extension: ".obj" }
};

/**
 * @typedef {Object} ExportOptions
 * @property {ExportType} type
 * @property {string} partRecordId
 * @property {string} cardId
 * @property {string} [fileId]
 */

/**
 * start an async translation (export) on Onshape for a given part.
 * @param {core.Record} authRecord the user to authenticate as
 * @param {core.Record} partRecord
 * @param {ExportType} type
 * @returns {string} translationId
 */
function startPartExport(authRecord, partRecord, type) {
    const partId = /** @type {string | undefined} */ (partRecord.get("part_id"));
    const did = partRecord.getString("document_id");
    const wvm = partRecord.getString("wvm");
    const wvmId = partRecord.getString("wvm_id");
    const eid = partRecord.getString("element_id");
    const configuration = /** @type {string | undefined} */ (partRecord.get("configuration"));

    const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));

    // Build the translation request body
    const formatName = EXPORT_FORMAT_MAP[type].onshape;
    if(!formatName) {
        throw new BadRequestError(`Unsupported export type: ${type}`);
    }

    // we ideally shouldn't get here for dxf outputs since we can't set the view to export;
    // onshape just.. decides for us?

    // there are 4 cases we need to handle, since onshape says not to use /translations unless there isn't
    // a separate explicit endpoint.
    // - part studio exports of types with explicit endpoints (/partstudios/.../export/gltf,obj,step)
    // - part studio exports of other types (/partstudios/.../translations)
    // - assembly exports of types with explicit endpoints (/assemblies/.../export/gltf,obj,step)
    // - assembly exports of other types (/assemblies/.../translations)
    // these all have different request bodies, so... fun times.

    const isPartStudio = !!partId;
    const hasExplicitEndpoint = ["gltf", "obj", "step"].includes(type);

    const wvmPrefix = wvm === "v" ? "v" : wvm === "m" ? "m" : "w";
    let translationBody, translationPath;

    if(isPartStudio && hasExplicitEndpoint) {
        // case 1: /partstudios/d/{did}/{wv}/{wvid}/e/{eid}/export/{gltf,obj,step}
        translationBody = /** @type DeepPartial<_schemas["BTBGltfExportParams"] | _schemas["BTBStepExportParams"] | _schemas["BTBObjExportParams"]> */({
            advancedParams: {
                configuration: configuration || undefined,
                partIds: partId // comma-separated (??)
            },
            meshParams: {
                resolution: "FINE",
                unit: "CENTIMETER" // most 3d printing software expects centimeters from experience
            },
            storeInDocument: false,
            notifyUser: false
        });
        translationPath = `v16/partstudios/d/${did}/${wvmPrefix}/${wvmId}/e/${eid}/export/${type.toLowerCase()}`;
    } else if(isPartStudio) {
        // case 2: /partstudios/d/{did}/{wv}/{wvid}/e/{eid}/translations
        translationBody = /** @type Partial<_schemas["BTTranslateFormatParams"]> */ ({
            formatName,
            storeInDocument: false,
            flattenAssemblies: true,
            flatten: true,
            configuration: configuration || undefined
        });
        translationPath = `v16/partstudios/d/${did}/${wvmPrefix}/${wvmId}/e/${eid}/translations`;
    } else if(!isPartStudio && hasExplicitEndpoint) {
        // case 3: /assemblies/d/{did}/{wv}/{wvid}/e/{eid}/export/{gltf,obj,step}
        translationBody = /** @type DeepPartial<_schemas["BTBGltfExportParams"] | _schemas["BTBStepExportParams"] | _schemas["BTBObjExportParams"]> */({
            advancedParams: {
                configuration: configuration || undefined
            },
            meshParams: {
                resolution: "FINE",
                unit: "CENTIMETER" // most 3d printing software expects centimeters from experience
            },
            storeInDocument: false,
            notifyUser: false
        });
        translationPath = `v16/assemblies/d/${did}/${wvmPrefix}/${wvmId}/e/${eid}/export/${type.toLowerCase()}`;
    } else {
        // case 4: /assemblies/d/{did}/{wv}/{wvid}/e/{eid}/translations
        translationBody = /** @type Partial<_schemas["BTTranslateFormatParams"]> */ ({
            formatName,
            storeInDocument: false,
            flattenAssemblies: true,
            flatten: true,
            configuration: configuration || undefined
        });
        translationPath = `v16/assemblies/d/${did}/${wvmPrefix}/${wvmId}/e/${eid}/translations`;
    }

    if(!translationBody || !translationPath) throw new InternalServerError("how tf");

    const translationRes = onshapeRequest(authRecord, "POST", translationPath, undefined, JSON.stringify(translationBody));

    if(translationRes.statusCode >= 400) {
        throw new InternalServerError(`Failed to start translation: ${translationRes.statusCode} - ${JSON.stringify(translationRes.body)}`);
    }

    const translationId = translationRes.body?.id;
    if(!translationId) {
        throw new InternalServerError("Translation response returned no ID");
    }

    return translationId;
}

/**
 * Save the exported file to the card's files array.
 * @param {core.Record} cardRecord 
 * @param {string | undefined} fileId 
 * @param {number[]} fileBytes 
 * @param {ExportType} type 
 */
function saveToCard(cardRecord, fileId, fileBytes, type) {
    try {
        // i don't know what type this is actually?
        const existingFiles = /** @type any[] */ (cardRecord.get("files"));

        const extension = EXPORT_FORMAT_MAP[type].extension || "";
        const filename = `${fileId}${extension}`;

        if(!existingFiles.includes(filename)) {
            existingFiles.push($filesystem.fileFromBytes(fileBytes, filename));
        }
        cardRecord.set("files", existingFiles);
        $app.save(cardRecord);
    } catch(err) {
        console.warn("Failed to attach file to card:", err);
    }
}

/**
 * download the result of a completed translation and attach it to the card
 * @param {core.Record} authRecord the user to authenticate as
 * @param {core.Record} exportQueueRecord
 * @returns {boolean} whether the download was successful
 */
function downloadExportResult(authRecord, exportQueueRecord) {
    const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));
    const { getConfigOption } = /** @type {typeof import("../config")} */ (require(`${__hooks}/config`));
    const { getValidOnshapeToken } = /** @type {typeof import("./onshape_auth")} */ (require(`${__hooks}/onshape/onshape_auth`));

    const translationId = exportQueueRecord.getString("translation_id");
    const partRecordId = exportQueueRecord.getString("part_record");
    const cardId = exportQueueRecord.getString("card");
    const fileId = exportQueueRecord.getString("file_id");
    const type = /** @type {ExportType} */ (exportQueueRecord.getString("type"));

    if(!translationId || !partRecordId || !cardId || !fileId || !type) {
        exportQueueRecord.set("status", "failed");
        exportQueueRecord.set("error_message", "Missing required fields for download");
        $app.save(exportQueueRecord);
        return false;
    }

    // Get the translation status
    const statusRes = onshapeRequest(authRecord, "GET", `v16/translations/${translationId}`);
    if(statusRes.statusCode >= 400) {
        exportQueueRecord.set("status", "failed");
        exportQueueRecord.set("error_message", `Failed to get translation status: ${statusRes.statusCode}`);
        $app.save(exportQueueRecord);
        return false;
    }

    const state = statusRes.body?.requestState;
    if(state !== "DONE") {
        exportQueueRecord.set("status", "failed");
        exportQueueRecord.set("error_message", `Translation ended with state: ${state}`);
        $app.save(exportQueueRecord);
        return false;
    }

    // get the external data IDs because we use storeInDocument=false
    const resultExternalDataIds = statusRes.body?.resultExternalDataIds;
    if(!resultExternalDataIds || !resultExternalDataIds.length) {
        exportQueueRecord.set("status", "failed");
        exportQueueRecord.set("error_message", "Translation completed but no result data IDs found");
        $app.save(exportQueueRecord);
        return false;
    }

    const did = /** @type {string} */ (statusRes.body?.documentId || statusRes.body?.resultDocumentId);
    if(!did) {
        exportQueueRecord.set("status", "failed");
        exportQueueRecord.set("error_message", "No document ID in translation response");
        $app.save(exportQueueRecord);
        return false;
    }

    // Download the external data using $http.send directly since we need raw bytes
    const metadata = getValidOnshapeToken(authRecord);
    if(!metadata) {
        exportQueueRecord.set("status", "failed");
        exportQueueRecord.set("error_message", "User is missing Onshape OAuth metadata");
        $app.save(exportQueueRecord);
        return false;
    }

    const baseOnshapeUrl = getConfigOption("onshape/baseDomain", "https://cad.onshape.com").replace(/\/+$/, "");
    const fid = resultExternalDataIds[0];
    const downloadRes = /** @type {any} */ ($http.send({
        url: `${baseOnshapeUrl}/api/v16/documents/d/${did}/externaldata/${fid}`,
        method: "GET",
        headers: {
            "Authorization": `Bearer ${metadata.access_token}`,
            "Accept": "application/octet-stream",
        },
        timeout: 120,
    }));

    if(!downloadRes || downloadRes.statusCode >= 400) {
        exportQueueRecord.set("status", "failed");
        exportQueueRecord.set("error_message", `Failed to download export: ${downloadRes?.statusCode ?? "no response"}`);
        $app.save(exportQueueRecord);
        return false;
    }

    
    // write the file using the raw bytes from the response
    const fileBytes = downloadRes.raw || downloadRes.body || downloadRes.json;
    
    if(cardId) {
        const cardRecord = $app.findRecordById("cards", cardId);
        if(cardRecord) {
            saveToCard(cardRecord, fileId, fileBytes, type);
        }
    }

    exportQueueRecord.set("status", "completed");
    $app.save(exportQueueRecord);

    return true;
}

/**
 * calculate a view matrix from a face normal for DXF export.
 * creates a view matrix that looks along the face normal so the face is shown flat
 * @param {{ x: number, y: number, z: number }} normal
 * @returns {number[]} 16-element view matrix
 */
function calculateViewMatrix(normal) {
    // normalize the... normal? hmmmm
    const nLen = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    // default to identity view matrix
    if(nLen < 1e-10) return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    const n = [normal.x / nLen, normal.y / nLen, normal.z / nLen];

    // compute an up vector that is not parallel to n
    let up;
    if(Math.abs(n[1]) < 0.9) {
        up = [0, 1, 0];
    } else {
        up = [1, 0, 0];
    }

    // right = n * up
    const right = [
        n[1] * up[2] - n[2] * up[1],
        n[2] * up[0] - n[0] * up[2],
        n[0] * up[1] - n[1] * up[0]
    ];

    // normalize right
    const rLen = Math.sqrt(right[0] * right[0] + right[1] * right[1] + right[2] * right[2]);
    if (rLen < 1e-10) {
        return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }
    const r = [right[0] / rLen, right[1] / rLen, right[2] / rLen];

    // newUp = r * n
    const newUp = [
        r[1] * n[2] - r[2] * n[1],
        r[2] * n[0] - r[0] * n[2],
        r[0] * n[1] - r[1] * n[0]
    ];

    // column-major view matrix
    return [
        r[0], r[1], r[2], 0,
        newUp[0], newUp[1], newUp[2], 0,
        -n[0], -n[1], -n[2], 0,
        0, 0, 0, 1
    ];
}

/**
 * get the principal axis and top face from PartHeuristicsResult stored in part_data.
 * @param {core.Record} partRecord
 * @returns {PartHeuristicsResult | null}
 */
function getPartHeuristics(partRecord) {
    const { parseJSON } = /** @type {typeof import("../util")} */ (require(`${__hooks}/util`));
    const partData = partRecord.get("part_data");
    if(!partData) return null;

    try {
        const data = parseJSON(partData);
        if(data && data.heuristic) {
            return data;
        }
    } catch(err) {
        console.warn("Failed to parse part_data for part", partRecord.id, err);
    }
    return null;
}

/**
 * Normalize a file response to always be a byte array.
 * @param {any} body
 * @returns {number[]}
 */
function normalizeFileBody(body) {
    if(!Array.isArray(body)) {
        const { encodeJSON } = /** @type {typeof import("../util")} */ (require(`${__hooks}/util`));
        return encodeJSON(body);
    }
    return body;
}

/**
 * Try to synchronously export a part if Onshape provides a synchronous API.
 * @param {core.Record} authRecord
 * @param {core.Record} partRecord
 * @param {core.Record} cardRecord
 * @param {ExportOptions} options
 * @returns {boolean} whether the export was handled synchronously
 */
function trySyncExport(authRecord, partRecord, cardRecord, options) {
    const { fileId, type } = options;
    const partId = partRecord.getString("part_id");
    const did = partRecord.getString("document_id");
    const wvm = partRecord.getString("wvm");
    const wvmId = partRecord.getString("wvm_id");
    const eid = partRecord.getString("element_id");
    const configuration = /** @type {string | undefined} */ (partRecord.get("configuration"));
    const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));
        
    if(type === "dxf" && partId) {
        // Onshape has an internal API for dxf exports that is far more customizable.
        // it... seems to work? PenguinCAM uses the same API.
        // We attempt to use it, but fallback to the async translation if it fails.
        try {
            const heuristics = getPartHeuristics(partRecord);
            const topFace = heuristics?.heuristic.topFace;
            const faceNormal = topFace?.normal;

            // Calculate view matrix from face normal and fall back to top-down
            let viewMatrix;
            if(faceNormal && faceNormal.length === 3) {
                viewMatrix = calculateViewMatrix({
                    x: faceNormal[0],
                    y: faceNormal[1],
                    z: faceNormal[2]
                }).join(",");
            } else {
                viewMatrix = "1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1";
            }

            // "partIds" field actually expects face IDs (??)
            const exportId = (topFace?.id) ? topFace.id : partId;

            const exportPath = `v16/documents/d/${did}/w/${wvmId}/e/${eid}/exportinternal`;

            const exportBody = {
                // i don't know why these are strings but i stole it from the official site requests
                format: "DXF",
                view: viewMatrix,
                version: "2013",
                units: "inch",
                flatten: "true",
                includeBendCenterlines: "true",
                includeSketches: "true",
                splinesAsPolylines: "true",
                triggerAutoDownload: "true",
                storeInDocument: "false",
                partIds: exportId
            };

            const exportRes = onshapeRequest(authRecord, "POST", exportPath, undefined, JSON.stringify(exportBody));

            if(exportRes.statusCode === 200) {
                console.log(`DXF exportinternal succeeded, got ${typeof exportRes.body === "string" ? exportRes.body.length : "?"} bytes`);
                saveToCard(cardRecord, fileId, normalizeFileBody(exportRes.body), type);
                return true;
            } else {
                console.warn(`exportinternal failed: ${exportRes.statusCode} - ${JSON.stringify(exportRes.body)}`);
                return false;
            }
        } catch {
            console.warn("Failed to synchronously export DXF, falling back to async translation");
            return false;
        }
    } else if(type === "gltf" && partId) {
        const wvmPrefix = wvm === "v" ? "v" : wvm === "m" ? "m" : "w";
        const exportPath = `v16/parts/d/${did}/${wvmPrefix}/${wvmId}/e/${eid}/partid/${partId}/gltf`;

        const { URLSearchParams } = /** @type {typeof import("../url")} */ (require(`${__hooks}/url`));

        const params = new URLSearchParams();
        params.set("configuration", configuration || "default");
        params.set("rollbackBarIndex", "-1");
        params.set("precomputedLevelOfDetail", "fine");
        params.set("outputFaceAppearances", "true");

        const exportRes = onshapeRequest(authRecord, "GET", `${exportPath}?${params.toString()}`);
        if(exportRes.statusCode >= 400) {
            console.warn(`Failed to synchronously export GLTF: ${exportRes.statusCode} - ${JSON.stringify(exportRes.body)}`);
            return false;
        }

        saveToCard(cardRecord, fileId, normalizeFileBody(exportRes.body), type);
    }

    return false;
}

/**
 * Queue a part for export and start the async translation process.
 * @param {core.App} app
 * @param {core.Record} authRecord
 * @param {ExportOptions} options
 */
function queuePartExport(app, authRecord, options) {
    const partRecord = app.findRecordById("parts", options.partRecordId);
    if(!partRecord) throw new NotFoundError(`Part record not found: ${options.partRecordId}`);

    const cardRecord = app.findRecordById("cards", options.cardId);
    if(!cardRecord) throw new NotFoundError(`Card record not found: ${options.cardId}`);

    // If this is an export type we can synchronously handle, do that
    if(trySyncExport(authRecord, partRecord, cardRecord, options)) return;

    // Create the export queue entry
    const queueCollection = app.findCollectionByNameOrId(EXPORT_QUEUE_COLLECTION);
    const queueRecord = new Record(queueCollection, {
        type: options.type,
        card: options.cardId || null,
        part_record: options.partRecordId,
        file_id: options.fileId || null,
        status: "queued",
        created_by: authRecord.id,
    });
    $app.save(queueRecord);

    // Start the export process asynchronously
    // Since PocketBase hooks are synchronous, we use a cron-style approach:
    // The webhook handler will pick up ACTIVE/queued exports on the next cron tick.
    // However, we immediately try to start the translation in the background.

    try {
        startExportProcess(authRecord, queueRecord, partRecord);
    } catch (err) {
        queueRecord.set("status", "failed");
        queueRecord.set("error_message", String(err));
        $app.save(queueRecord);
    }
}

/**
 * start the export process
 * @param {core.Record} authRecord
 * @param {core.Record} queueRecord
 * @param {core.Record} partRecord
 */
function startExportProcess(authRecord, queueRecord, partRecord) {
    const type = /** @type {ExportType} */ (queueRecord.get("type"));

    // ensure the webhook exists
    const { ensureWebhook } = /** @type {typeof import("./webhooks")} */ (require(`${__hooks}/onshape/webhooks`));
    ensureWebhook(authRecord, ["onshape.model.translation.complete"], {
        documentId: partRecord.getString("document_id"),
    });

    const translationId = startPartExport(authRecord, partRecord, type);

    queueRecord.set("status", "translating");
    queueRecord.set("translation_id", translationId);
    $app.save(queueRecord);
}

/**
 * process a completed translation; called from the webhook handler when an
 * onshape.model.translation.complete event is received
 * @param {any} payload the webhook payload body
 */
function handleExportWebhook(payload) {
    const translationId = payload?.translationId;
    if(!translationId) {
        console.warn(`Export webhook: missing translationId in payload`);
        return;
    }

    console.log(`Export webhook: translation ${translationId} complete`);

    // Find the export queue entry for this translation
    let queueRecord;
    try {
        queueRecord = $app.findFirstRecordByData(EXPORT_QUEUE_COLLECTION, "translation_id", translationId);
    } catch {
        console.warn(`Export webhook: no queue entry for translation ${translationId}`);
        return;
    }

    if(!queueRecord) {
        console.warn(`Export webhook: no queue entry for translation ${translationId}`);
        return;
    }

    const status = /** @type {string} */ (queueRecord.get("status"));
    if(status !== "translating") return;

    const createdBy = /** @type {string | undefined} */ (queueRecord.get("created_by"));
    if(!createdBy) {
        queueRecord.set("status", "failed");
        queueRecord.set("error_message", "No creator user on export queue entry");
        $app.save(queueRecord);
        return;
    }

    let authRecord;
    try {
        authRecord = $app.findRecordById("users", createdBy);
    } catch {
        queueRecord.set("status", "failed");
        queueRecord.set("error_message", "Creator user not found");
        $app.save(queueRecord);
        return;
    }

    if(!authRecord) {
        queueRecord.set("status", "failed");
        queueRecord.set("error_message", "Creator user not found");
        $app.save(queueRecord);
        return;
    }

    try {
        downloadExportResult(authRecord, queueRecord);
    } catch (err) {
        console.error("Export webhook: error downloading result", err);
        queueRecord.set("status", "failed");
        queueRecord.set("error_message", String(err));
        $app.save(queueRecord);
    }
}

/**
 * Resume unfinished exports on startup.
 * Finds all export_queue entries with status "queued" or "translating" and
 * tries to restart or check on them.
 */
function resumeUnfinishedExports() {
    console.log("Resuming unfinished exports...");

    try {
        const records = $app.findAllRecords(EXPORT_QUEUE_COLLECTION);

        console.log(`Found ${records.length} export queue records, checking for unfinished exports...`);

        for(const record of records) {
            if(!record) continue;

            const status = /** @type {string} */ (record.get("status"));

            if(status === "completed" || status === "failed") continue;

            const translationId = /** @type {string | undefined} */ (record.get("translation_id"));
            const createdBy = /** @type {string | undefined} */ (record.get("created_by"));

            if(!createdBy) {
                record.set("status", "failed");
                record.set("error_message", "No creator user on resume");
                $app.save(record);
                continue;
            }

            let authRecord;
            try {
                authRecord = $app.findRecordById("users", createdBy);
            } catch {
                record.set("status", "failed");
                record.set("error_message", "Creator user not found on resume");
                $app.save(record);
                continue;
            }

            if(!authRecord) {
                record.set("status", "failed");
                record.set("error_message", "Creator user not found on resume");
                $app.save(record);
                continue;
            }

            if(status === "translating" && translationId) {
                // Check the translation status
                try {
                    const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));
                    const statusRes = onshapeRequest(authRecord, "GET", `v16/translations/${translationId}`);

                    if(statusRes.statusCode >= 400) {
                        record.set("status", "failed");
                        record.set("error_message", `Translation lookup failed on resume: ${statusRes.statusCode}`);
                        $app.save(record);
                        continue;
                    }

                    const state = statusRes.body?.requestState;

                    if(state === "DONE") {
                        // Translation completed while we were away, download it
                        downloadExportResult(authRecord, record);
                    } else if(state === "ACTIVE") {
                        // Still running, keep waiting (webhook will handle it)
                        console.log(`Export ${record.id} translation ${translationId} still ACTIVE, waiting for webhook`);
                    } else if(state === "FAILED") {
                        record.set("status", "failed");
                        record.set("error_message", statusRes.body?.failureReason || "Translation failed");
                        $app.save(record);
                    }
                } catch(err) {
                    console.warn(`Failed to check translation status for ${record.id}:`, err);
                }
            } else if(status === "queued") {
                // Restart the export process
                try {
                    const partRecordId = /** @type {string} */ (record.get("part_record"));
                    const partRecord = $app.findRecordById("parts", partRecordId);
                    if(partRecord) {
                        startExportProcess(authRecord, record, partRecord);
                    } else {
                        record.set("status", "failed");
                        record.set("error_message", "Part record not found on resume");
                        $app.save(record);
                    }
                } catch(err) {
                    record.set("status", "failed");
                    record.set("error_message", String(err));
                    $app.save(record);
                }
            }
        }

        console.log("Finished resuming unfinished exports.");
    } catch(e) {
        console.error(`Failed to resume unfinished exports: ${e}`);
    }
}

module.exports = {
    queuePartExport,
    handleExportWebhook,
    resumeUnfinishedExports,
};

