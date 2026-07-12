// @ts-check
/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
    if(!e.record) return e.next();

    try {
        const { getEntityConfig, computeSnapshot, resolveEntityInfo, logActivity } = /** @type {import("./activity_log")} */ (require(`${__hooks}/activity_log.js`));
        const config = getEntityConfig(e.record.collection().name);
        if(!config) return e.next(); // Not a tracked collection
        
        const entityTitle = e.record.getString(config.titleField) || "(untitled)";
        const info = resolveEntityInfo(e.app, e.record.collection().name, e.record);
        
        logActivity(e.app, {
            action: "create",
            entityType: config.type,
            entityId: e.record.id,
            entityTitle: entityTitle,
            actor: e.auth ? e.auth.id : null,
            changes: computeSnapshot(e.record, config.fields),
            projectId: info.projectId,
        });
    } catch(err) {
        console.error("Error logging activity for create:", err);
    }
    
    e.next();
});

onRecordUpdateRequest((e) => {
    if(!e.record) return e.next();

    try {
        const { getEntityConfig, computeChanges, resolveEntityInfo, logActivity, tryMergeUpdate } = /** @type {import("./activity_log")} */ (require(`${__hooks}/activity_log.js`));
        const config = getEntityConfig(e.record.collection().name);
        if(!config) return e.next(); // Not a tracked collection
        
        // Changes are computed before the save so we have the original values
        const original = e.record.original();
        const changes = computeChanges(e.app, original, e.record, config.fields);
        
        // Only log if something actually changed
        if(Object.keys(changes).length === 0) return e.next();
        
        const entityTitle =
            e.record.getString(config.titleField) ||
            (original ? original.getString(config.titleField) : "") ||
            "(untitled)";
        
        const info = resolveEntityInfo(e.app, e.record.collection().name, e.record);

        // Try to merge into a recent update record for the same entity
        const merged = tryMergeUpdate(e.app, {
            entityType: config.type,
            entityId: e.record.id,
            changes: changes,
            actor: e.auth ? e.auth.id : null,
        });

        if(!merged) logActivity(e.app, {
            action: "update",
            entityType: config.type,
            entityId: e.record.id,
            entityTitle: entityTitle,
            actor: e.auth ? e.auth.id : null,
            changes: changes,
            projectId: info.projectId,
        });
    } catch(err) {
        console.error("Error logging activity for update:", err);
    }
    
    e.next();
});

onRecordDeleteRequest((e) => {
    if(!e.record) return e.next();

    try {
        const { getEntityConfig, resolveEntityInfo, logActivity, tryMergeDelete } = /** @type {import("./activity_log")} */ (require(`${__hooks}/activity_log.js`));
        const config = getEntityConfig(e.record.collection().name);
        if(!config) return e.next();
        
        const entityTitle = e.record.getString(config.titleField) || "(untitled)";
        
        const info = resolveEntityInfo(e.app, e.record.collection().name, e.record);

        // Try to merge into a recent update record (converts it to a delete)
        const merged = tryMergeDelete(e.app, {
            entityType: config.type,
            entityId: e.record.id,
            actor: e.auth ? e.auth.id : null,
        });

        if(!merged) logActivity(e.app, {
            action: "delete",
            entityType: config.type,
            entityId: e.record.id,
            entityTitle: entityTitle,
            actor: e.auth ? e.auth.id : null,
            changes: null,
            projectId: info.projectId,
        });
    } catch(err) {
        console.error("Error logging activity for delete:", err);
    }
    
    e.next();
});

routerAdd("POST", "/api/clear_activity_log", (e) => {
    if(!e.auth) throw new UnauthorizedError("Authentication required");
    if(!e.auth.getBool("is_admin")) throw new ForbiddenError("Only admins can clear the activity log");

    // we could run a custom query here, but since we want to run event hooks, we
    // just loop through all activity_log records and delete in batches
    const batchSize = 100;
    while(true) {
        const records = $app.findRecordsByFilter("activity_log", "", "", batchSize, 0);
        if(records.length === 0) break;

        for(const record of records) {
            if(!record) continue;
            $app.delete(record);
        }
    }
});