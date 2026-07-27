// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

routerAdd("POST", "/api/onshape/webhook", (e) => {
    const body = e.requestInfo().body;
    if(!body || typeof body !== "object") return e.json(200, { ok: true });

    const event = body.event;
    if(!event) return e.json(200, { ok: true });

    console.log(`Webhook received: ${event} | data: ${body}`);

    // Lifecycle events, ack immediately
    if(event === "webhook.ping" || event === "webhook.register" || event === "webhook.unregister") {
        return e.json(200, { ok: true });
    }

    // PocketBase handlers run in isolated contexts, so we can't use a callback system. Instead,
    // we just dispatch manually here. Maybe there's a cleaner way to do this, but it works.
    try {
        switch(event) {
            case "onshape.model.translation.complete":
                const { processTranslationComplete } = require(`${__hooks}/onshape/exports`);
                processTranslationComplete(body);
                break;
            default:
                console.warn(`No handler for received webhook event ${event}`);
        }
    } catch (err) {
        console.error(`Error handling ${event} webhook: ${err}`);
    }

    return e.json(200, { ok: true });
});