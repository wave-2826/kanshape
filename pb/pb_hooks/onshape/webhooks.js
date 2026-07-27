// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

const ACTIVE_WEBHOOKS_COLLECTION = "active_webhooks";

// TODO: store last_used and clean up very old webhooks.
// We use persistent webhooks because teams are likely to create
// e.g. multiple parts in a document or we need updates for old parts.
// Onshape doesn't document limits but it would be ideal to not leave them around.

/**
 * All known Onshape webhook event types (API v16).
 * @typedef {"onshape.user.lifecycle.updateappsettings"
 *   | "onshape.revision.created"
 *   | "onshape.model.lifecycle.changed.externalreferences"
 *   | "onshape.model.lifecycle.changed.namedviews"
 *   | "onshape.model.lifecycle.createworkspace"
 *   | "onshape.comment.update"
 *   | "onshape.model.lifecycle.metadata"
 *   | "onshape.comment.delete"
 *   | "onshape.model.lifecycle.createversion"
 *   | "onshape.model.translation.complete"
 *   | "webhook.ping"
 *   | "onshape.model.lifecycle.createelement"
 *   | "onshape.plm.job.created"
 *   | "onshape.document.lifecycle.shared"
 *   | "onshape.plm.settings.changed"
 *   | "onshape.model.lifecycle.mergeworkspace"
 *   | "webhook.unregister"
 *   | "onshape.model.lifecycle.deleteworkspace"
 *   | "onshape.document.lifecycle.statechange"
 *   | "onshape.comment.create"
 *   | "onshape.workflow.transition"
 *   | "onshape.model.lifecycle.updateworkspaceunits"
 *   | "webhook.register"
 *   | "onshape.model.lifecycle.restoreworkspace"
 *   | "onshape.model.lifecycle.deleteelement"
 *   | "onshape.document.lifecycle.created"
 *   | "onshape.model.lifecycle.changed"} OnshapeWebhookEvent
 */

/**
 * @typedef {Object} WebhookOptions See https://onshape-public.github.io/docs/app-dev/webhook/#events for
 *  parameters required for various groups.
 * @property {string} [documentId] scope to a specific document.
 *  this OR companyId is for onshape.comment, onshape.document, onshape.model, and onshape.revision groups
 * @property {string} [companyId] scope to a specific company.
 *  this OR documentId is for onshape.comment, onshape.document, onshape.model, and onshape.revision groups
 *  (not onshape.document.lifecycle.statechange)  
 *  also required for onshape.workflow.
 * @property {string} [clientId] scope to a specific onshape client/app.
 *  required for the onshape.user group.
 * @property {boolean} [collapseEvents] collapse repeated events (default: true)
 */

/**
 * find an active webhook record with the given url and all given events  
 * technically, this will return unexpected results when events are spread across
 * multiple webhooks or there is only a partial match but... oh well
 * @param {string} webhookURL
 * @param {OnshapeWebhookEvent[]} events
 * @param {WebhookOptions} [options]
 * @returns {core.Record | null}
 */
function findWebhookFor(webhookURL, events, options) {
    const { parseJSON } = /** @type {typeof import("../util")} */ (require(`${__hooks}/util`));

    // we can just query all records since there shouldn't be many
    const records = $app.findAllRecords(ACTIVE_WEBHOOKS_COLLECTION);
    for(const record of records) {
        if(!record) continue;

        const url = record.getString("url");
        const storedEvents = parseJSON(record.get("events"));
        if(options?.documentId && record.getString("document_id") !== options.documentId) continue;
        if(options?.companyId && record.getString("company_id") !== options.companyId) continue;
        if(options?.clientId && record.getString("client_id") !== options.clientId) continue;
        
        if(record && url === webhookURL && events.every(e => storedEvents.includes(e))) {
            return record;
        }
    }
    
    return null;
}

/**
 * ensure an onshape webhook exists on Onshape for the given events.
 * this assumes that onshape will never clean up non-transient webhooks,
 * which i think is true?
 *
 * @param {core.Record} authRecord user to authenticate as
 * @param {OnshapeWebhookEvent[]} events event types to subscribe to
 * @param {WebhookOptions} [options] additional webhook options
 * @returns {{ webhookId: string, isNew: boolean }}
 */
function ensureWebhook(authRecord, events, options) {
    const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));

    const { getConfigOption } = /** @type {typeof import("../config")} */ (require(`${__hooks}/config`));
    const baseUrl = getConfigOption("site/publicUrl", "");
    if(!baseUrl) {
        throw new InternalServerError("site/publicUrl config option is required for webhook-based exports");
    }

    // if the baseurl is localhost or 127.0.0.1, we can't register a webhook because Onshape can't reach it
    if(/https?:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl)) {
        throw new InternalServerError(`site/publicUrl config option must be a public URL for webhook-based exports, but is ${baseUrl}`);
    }

    const webhookUrl = `${baseUrl.replace(/\/+$/, "")}/api/onshape/webhook`;
    const existingRecord = findWebhookFor(webhookUrl, events, options);

    if(existingRecord) {
        const { parseJSON } = /** @type {typeof import("../util")} */ (require(`${__hooks}/util`));
        /** @type OnshapeWebhookEvent[] */
        const storedEvents = parseJSON(existingRecord.get("events"));
        const existingWebhookId = existingRecord.getString("webhook_id");

        if(storedEvents.length === events.length && storedEvents.every(e => events.includes(e))) {
            // webhook is still valid
            return { webhookId: existingWebhookId, isNew: false };
        }

        // something changed, so delete the old webhook from Onshape and DB
        // i don't know if this is actually valid because it may be tied to the
        // original auth?
        console.log(`Webhook config changed for ${webhookUrl}, recreating...`);
        if(existingWebhookId) {
            try {
                onshapeRequest(authRecord, "DELETE", `v16/webhooks/${existingWebhookId}`);
            } catch {
                // oh well
            }
        }
        try {
            $app.delete(existingRecord);
        } catch {
            // oh well
        }
    }

    // create a new persistent webhook and save it
    /** @type {any} */
    const webhookBody = {
        description: `Kanshape webhook for ${events.join(",")}`,
        events,
        options: {
            collapseEvents: options?.collapseEvents ?? true,
        },
        url: webhookUrl,
        isTransient: false
    };

    if(options?.documentId) webhookBody.documentId = options.documentId;
    if(options?.companyId) webhookBody.companyId = options.companyId;
    if(options?.clientId) webhookBody.clientId = options.clientId;

    const webhookRes = onshapeRequest(authRecord, "POST", "v16/webhooks", undefined, JSON.stringify(webhookBody));
    if(webhookRes.statusCode >= 400) {
        throw new InternalServerError(`Failed to register webhook: ${webhookRes.statusCode} - ${JSON.stringify(webhookRes.body)}`);
    }

    const webhookId = webhookRes.body?.id;
    if(!webhookId) throw new InternalServerError("Webhook registration returned no ID");

    const collection = $app.findCollectionByNameOrId(ACTIVE_WEBHOOKS_COLLECTION);
    const record = new Record(collection, {
        webhook_id: webhookId,
        events: JSON.stringify(events.slice().sort()),
        url: webhookUrl,
        client_id: options?.clientId ?? null,
        document_id: options?.documentId ?? null,
        company_id: options?.companyId ?? null
    });
    $app.save(record);

    console.log(`Created persistent webhook ${webhookId} for ${webhookUrl} with event(s) ${events.join(", ")}`);
    return { webhookId, isNew: true };
}

/**
 * delete a webhook from Onshape and remove it from the active webhooks collection.
 * @param {core.Record} authRecord
 * @param {string} webhookId
 */
function deleteWebhook(authRecord, webhookId) {
    const { onshapeRequest } = /** @type {typeof import("./onshape_proxy")} */ (require(`${__hooks}/onshape/onshape_proxy`));

    try {
        onshapeRequest(authRecord, "DELETE", `v16/webhooks/${webhookId}`);
    } catch (err) {
        console.warn(`Failed to delete webhook ${webhookId} from Onshape:`, err);
    }

    try {
        const record = $app.findFirstRecordByData(ACTIVE_WEBHOOKS_COLLECTION, "webhook_id", webhookId);
        if(record) {
            $app.delete(record);
        }
    } catch(err) {
        console.warn(`Failed to delete webhook record ${webhookId}: ${err}`);
    }
}

module.exports = {
    ACTIVE_WEBHOOKS_COLLECTION,
    ensureWebhook,
    deleteWebhook,
};
