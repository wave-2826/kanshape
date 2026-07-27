// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

/**
 * @import { PartExport } from "../../../sk/src/lib/data/parts";
 */

routerAdd("POST", "/api/parts/export_all", (e) => {
    if(!e.auth) throw new UnauthorizedError("Unauthorized");
    const info = e.requestInfo();

    console.log("1");
    const body = /** @type {PartExport[]} */ (info.body);
    if(!Array.isArray(body)) throw new BadRequestError("Invalid request body");

    console.log("2");
    const { queuePartExport } = /** @type {typeof import("./exports")} */ (require(`${__hooks}/onshape/exports`));

    for(const part of body) {
        console.log("3");
        if(!part.cardId) throw new BadRequestError("Missing cardId");
        if(!part.type) throw new BadRequestError("Missing export type");
        if(!part.partRecordId) throw new BadRequestError("Missing partRecordId");

        console.log(`Would queue export for part ${part.partRecordId} (card ${part.cardId}) of type ${part.type}`);
        // queuePartExport(e.app, e.auth, {
        //     type: part.type,
        //     partRecordId: part.partRecordId,
        //     cardId: part.cardId,
        //     fileId: part.id,
        // });
    }

    return e.json(200, { ok: true });
});

// webhook endpoint for Onshape to notify us when a translation completes.
// this must be accessible from the internet at the URL configured in app/baseUrl.
routerAdd("POST", "/api/onshape/export/webhook", (e) => {
    const { handleExportWebhook } = /** @type {import("./exports")} */ (require(`${__hooks}/onshape/exports`));
    return handleExportWebhook(e);
});

onBootstrap((e) => {
    e.next();
    
    // resume unfinished exports on startup
    const { resumeUnfinishedExports } = /** @type {import("./exports")} */ (require(`${__hooks}/onshape/exports`));
    try {
        resumeUnfinishedExports();
    } catch (err) {
        console.error("Failed to resume unfinished exports:", err);
    }
});