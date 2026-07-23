// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

/**
 * TODO: add an `active_webhooks` table and use `isTransient=false` for persistent webhooks
 */

const EXPORT_QUEUE_COLLECTION = "export_queue";

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
 * @property {string} [cardId]
 * @property {string} [fileId]
 */

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
 * @returns {{ principalAxis?: [number, number, number], topFace?: { id: string, normal: [number, number, number] } } | null}
 */
function getPartHeuristics(partRecord) {
    const { parseJSON } = /** @type {typeof import("../util")} */ (require(`${__hooks}/util`));
    const partData = partRecord.get("part_data");
    if(!partData) return null;

    try {
        const data = parseJSON(partData);
        if(data && data.heuristic) {
            return {
                principalAxis: data.heuristic.principalAxis,
                topFace: data.heuristic.topFace,
            };
        }
    } catch(err) {
        console.warn("Failed to parse part_data for part", partRecord.id, err);
    }
    return null;
}

/**
 * start an async translation (export) on Onshape for a given part.
 * @param {core.Record} authRecord the user to authenticate as
 * @param {core.Record} partRecord
 * @param {ExportType} type
 * @param {string} webhookUrl the URL Onshape should notify when the translation completes
 * @returns {{ translationId: string, webhookId: string }}
 */
function startPartExport(authRecord, partRecord, type, webhookUrl) {
    const did = partRecord.getString("document_id");
    const wvm = partRecord.getString("wvm");
    const wvmId = partRecord.getString("wvm_id");
    const eid = partRecord.getString("element_id");
    const configuration = /** @type {string | undefined} */ (partRecord.get("configuration"));

    const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));

    // first, register a webhook for translation completion
    const webhookBody = {
        documentId: did,
        events: ["onshape.model.translation.complete"],
        options: {
            collapseEvents: false,
        },
        url: webhookUrl,
        // transient webhooks are auto-cleaned by Onshape after inactivity.
        // We use transient for now since we clean up manually on completion.
        isTransient: true,
    };

    const webhookRes = onshapeRequest(authRecord, "POST", "v16/webhooks", undefined, webhookBody);
    if(webhookRes.statusCode >= 400) {
        throw new InternalServerError(`Failed to register webhook: ${webhookRes.statusCode}`);
    }

    const webhookId = webhookRes.body?.id;
    if(!webhookId) {
        throw new InternalServerError("Webhook registration returned no ID");
    }

    // Build the translation request body
    const formatName = EXPORT_FORMAT_MAP[type].onshape;
    if(!formatName) {
        throw new BadRequestError(`Unsupported export type: ${type}`);
    }

    const translationBody = {
        formatName,
        storeInDocument: false
    };

    // For DXF exports, add view parameters
    if(type === "dxf") {
        const heuristics = getPartHeuristics(partRecord);
        let faceNormal = null;

        if(heuristics?.topFace) {
            faceNormal = {
                x: heuristics.topFace.normal[0],
                y: heuristics.topFace.normal[1],
                z: heuristics.topFace.normal[2],
            };
        }

        const viewMatrix = faceNormal
            ? calculateViewMatrix(faceNormal).join(",")
            : "1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1";

        translationBody.view = viewMatrix;
        translationBody.flatten = true;
    }

    // Start the translation
    const wvmPrefix = wvm === "v" ? "v" : wvm === "m" ? "m" : "w";
    const translationPath = `v16/partstudios/d/${did}/${wvmPrefix}/${wvmId}/e/${eid}/translations`;

    const translationRes = onshapeRequest(authRecord, "POST", translationPath, undefined, translationBody);

    if(translationRes.statusCode >= 400) {
        // Clean up the webhook on failure
        try {
            onshapeRequest(authRecord, "DELETE", `v16/webhooks/${webhookId}`);
        } catch { /* ignore cleanup error */ }
        throw new InternalServerError(`Failed to start translation: ${translationRes.statusCode} - ${JSON.stringify(translationRes.body)}`);
    }

    const translationId = translationRes.body?.id;
    if(!translationId) {
        throw new InternalServerError("Translation response returned no ID");
    }

    return { translationId, webhookId };
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

    // Save the file to pb_data
    const { fileMode } = /** @type {typeof import("../util")} */ (require(`${__hooks}/util`));

    const exportDir = `${__hooks}/../pb_data/_part_exports`;
    try {
        $os.stat(exportDir);
    } catch {
        $os.mkdir(exportDir, fileMode.rw);
    }

    const extension = EXPORT_FORMAT_MAP[type].extension || "";
    const filename = fileId ? `${fileId}${extension}` : `${translationId}${extension}`;
    const filePath = `${exportDir}/${filename}`;

    // write the file using the raw bytes from the response
    const fileBytes = downloadRes.raw || downloadRes.body || downloadRes.json;
    $os.writeFile(filePath, fileBytes, fileMode.rw);

    // if there's a card, attach the file to it
    if(cardId) {
        try {
            const cardRecord = $app.findRecordById("cards", cardId);
            if(cardRecord) {
                // i don't know what type this is actually?
                const existingFiles = /** @type any[] */ (cardRecord.get("files"));
                if(!existingFiles.includes(filename)) {
                    existingFiles.push($filesystem.fileFromBytes(fileBytes, filename));
                }
                cardRecord.set("files", existingFiles);
                $app.save(cardRecord);
            }
        } catch(err) {
            console.warn("Failed to attach file to card:", err);
        }
    }

    exportQueueRecord.set("status", "completed");
    exportQueueRecord.set("file_id", filename);
    $app.save(exportQueueRecord);

    // clean up the Onshape webhook
    try {
        onshapeRequest(authRecord, "DELETE", `v16/webhooks/${exportQueueRecord.get("webhook_id")}`);
    } catch { /* ignore cleanup error */ }

    return true;
}

/**
 * Queue a part for export and start the async translation process.
 * @param {core.App} app
 * @param {core.Record} authRecord
 * @param {ExportOptions} options
 * @returns {core.Record} The created export_queue record
 */
function queuePartExport(app, authRecord, options) {
    const partRecord = app.findRecordById("parts", options.partRecordId);
    if(!partRecord) throw new NotFoundError(`Part record not found: ${options.partRecordId}`);

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

    return queueRecord;
}

/**
 * start the export process
 * @param {core.Record} authRecord
 * @param {core.Record} queueRecord
 * @param {core.Record} partRecord
 */
function startExportProcess(authRecord, queueRecord, partRecord) {
    const type = /** @type {ExportType} */ (queueRecord.get("type"));

    // Build the webhook URL pointing back to our server
    // We derive the base URL from config
    const { getConfigOption } = /** @type {typeof import("../config")} */ (require(`${__hooks}/config`));
    const baseUrl = getConfigOption("app/baseUrl", "");
    if(!baseUrl) {
        throw new InternalServerError("app/baseUrl config option is required for webhook-based exports");
    }

    const webhookUrl = `${baseUrl.replace(/\/+$/, "")}/api/onshape/export/webhook`;

    const { translationId, webhookId } = startPartExport(authRecord, partRecord, type, webhookUrl);

    queueRecord.set("status", "translating");
    queueRecord.set("translation_id", translationId);
    queueRecord.set("webhook_id", webhookId);
    $app.save(queueRecord);
}

/**
 * handle a webhook notification from Onshape for a completed translation
 * @param {core.RequestEvent} e
 */
function handleExportWebhook(e) {
    if(e.request?.url?.path !== "/api/onshape/export/webhook") return e.next();

    // Parse the webhook notification
    const body = e.requestInfo().body;
    if(!body || typeof body !== "object") {
        console.warn("Export webhook: invalid body", body);
        return e.json(200, { ok: true }); // Ack anyway so Onshape doesn't retry
    }

    const event = body.event;
    const translationId = body.translationId;

    if(!event || !translationId) {
        console.warn("Export webhook: missing event or translationId", body);
        return e.json(200, { ok: true });
    }

    if(event !== "onshape.model.translation.complete") {
        // Not our event, ignore but ack
        return e.json(200, { ok: true });
    }

    console.log("Export webhook: translation complete", translationId);

    // Find the export queue entry for this translation
    let queueRecord;
    try {
        queueRecord = $app.findFirstRecordByData(EXPORT_QUEUE_COLLECTION, "translation_id", translationId);
    } catch {
        // Not found - might be a translation we didn't start
        console.warn("Export webhook: no queue entry for translation", translationId);
        return e.json(200, { ok: true });
    }

    if(!queueRecord) {
        console.warn("Export webhook: no queue entry for translation", translationId);
        return e.json(200, { ok: true });
    }

    const status = /** @type {string} */ (queueRecord.get("status"));
    // Already completed or failed, ignore
    if(status !== "translating") return e.json(200, { ok: true });

    // Find the user who created the export to use their auth for downloading
    const createdBy = /** @type {string | undefined} */ (queueRecord.get("created_by"));
    if(!createdBy) {
        queueRecord.set("status", "failed");
        queueRecord.set("error_message", "No creator user on export queue entry");
        $app.save(queueRecord);
        return e.json(200, { ok: true });
    }

    let authRecord;
    try {
        authRecord = $app.findRecordById("users", createdBy);
    } catch {
        queueRecord.set("status", "failed");
        queueRecord.set("error_message", "Creator user not found");
        $app.save(queueRecord);
        return e.json(200, { ok: true });
    }

    if(!authRecord) {
        queueRecord.set("status", "failed");
        queueRecord.set("error_message", "Creator user not found");
        $app.save(queueRecord);
        return e.json(200, { ok: true });
    }

    // Download the result
    try {
        downloadExportResult(authRecord, queueRecord);
    } catch (err) {
        console.error("Export webhook: error downloading result", err);
        queueRecord.set("status", "failed");
        queueRecord.set("error_message", String(err));
        $app.save(queueRecord);
    }

    return e.json(200, { ok: true });
}

/**
 * Resume unfinished exports on startup.
 * Finds all export_queue entries with status "queued" or "translating" and
 * tries to restart or check on them.
 */
function resumeUnfinishedExports() {
    console.log("Resuming unfinished exports...");

    const records = $app.findAllRecords(EXPORT_QUEUE_COLLECTION);

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
}

module.exports = {
    calculateViewMatrix,
    getPartHeuristics,
    startPartExport,
    downloadExportResult,
    queuePartExport,
    startExportProcess,
    handleExportWebhook,
    resumeUnfinishedExports,
};

