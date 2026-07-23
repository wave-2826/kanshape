// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

routerAdd("POST", "/api/parts/export_all", async (e) => {
    if(!e.auth) throw new UnauthorizedError("Unauthorized");
    const info = e.requestInfo();
    if(!Array.isArray(info.body)) throw new BadRequestError("Invalid request body");

    const { queuePartExport } = /** @type {typeof import("./exports")} */ (require(`${__hooks}/onshape/exports`));

    /** @type {string[]} */
    const queueIds = [];

    for(const part of info.body) {
        if(!part.cardId) throw new BadRequestError("Missing cardId");
        if(!part.type) throw new BadRequestError("Missing export type");
        if(!part.partRecordId) throw new BadRequestError("Missing partRecordId");

        const record = queuePartExport(e.app, e.auth, {
            type: part.type,
            partRecordId: part.partRecordId,
            cardId: part.cardId,
            fileId: part.id,
        });

        queueIds.push(record.id);
    }

    return e.json(200, { queueIds });
});

// webhook endpoint for Onshape to notify us when a translation completes.
// this must be accessible from the internet at the URL configured in app/baseUrl.
routerAdd("POST", "/api/onshape/export/webhook", (e) => {
    const { handleExportWebhook } = /** @type {import("./exports")} */ (require(`${__hooks}/onshape/exports`));
    return handleExportWebhook(e);
});

// resume unfinished exports on startup
const { resumeUnfinishedExports } = /** @type {import("./exports")} */ (require(`${__hooks}/onshape/exports`));
try {
    resumeUnfinishedExports();
} catch (err) {
    console.error("Failed to resume unfinished exports:", err);
}