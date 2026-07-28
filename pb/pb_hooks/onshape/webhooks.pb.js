// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

routerAdd("POST", "/api/onshape/webhook", (e) => {
    const body = e.requestInfo().body;
    if(!body || typeof body !== "object") return e.json(200, { ok: true });

    const event = body.event;
    if(!event) return e.json(200, { ok: true });

    const { verifyWebhook } = /** @type {typeof import("./webhooks")} */ (require(`${__hooks}/onshape/webhooks`));
    if(!verifyWebhook(e)) return;

    console.log(`Webhook received: ${event} | data: ${JSON.stringify(body)}`);

    // Lifecycle events, ack immediately
    if(event === "webhook.ping" || event === "webhook.register" || event === "webhook.unregister") {
        return e.json(200, { ok: true });
    }

    // PocketBase handlers run in isolated contexts, so we can't use a callback system. Instead,
    // we just dispatch manually here. Maybe there's a cleaner way to do this, but it works.
    try {
        switch(event) {
            case "onshape.model.translation.complete":
                const { handleExportWebhook } = require(`${__hooks}/onshape/exports`);
                handleExportWebhook(body);
                break;
            default:
                console.warn(`No handler for received webhook event ${event}`);
        }
    } catch (err) {
        console.error(`Error handling ${event} webhook: ${err}`);
    }

    return e.json(200, { ok: true });
});