// @ts-check
/// <reference path="../pb_data/types.d.ts" />

/**
 * How far back (minutes) to look for an existing activity_log record to merge into
 * instead of creating a new one.
 */
const MERGE_THRESHOLD_MINUTES = 2;

/**
 * @typedef {string | { name: string, type: "normal" | "section" | "assignment" | "json" }} TrackedField
 */

/**
 * @typedef {import("../../sk/src/lib/data/activity").EntryChanges} EntryChanges
 * @typedef {import("../../sk/src/lib/data/activity").EntryValue} EntryValue
 * @typedef {import("../../sk/src/lib/data/cards").CardAssignmentData} CardAssignmentData
 */

/**
 * Maps collection name to entity type config; also acts as the list
 * of tracked collections
 * @type {{ [collectionName: string]: {
 *      type: string, titleField: string, fields: TrackedField[]
 * } }}
 */
let ENTITY_CONFIG = {
    cards: { type: "card", titleField: "title", fields: [
        "title", "description",
        { name: "section", type: "section" },
        "subprojects", "board", "priority",
        { name: "metadata", type: "json" },
        "due_by", "duration_days", "dependencies",
        { name: "assignment_data", type: "assignment" }
    ] },
    boards: { type: "board", titleField: "title", fields: [
        "title", "description", "type", "part_id_prefix",
        { name: "custom_card_fields", type: "json" }, { name: "linked_sites", type: "json" }
    ] },
    projects:    { type: "project",    titleField: "title", fields: ["title", "description", "color", { name: "linked_sites", type: "json" }] },
    sections:    { type: "section",    titleField: "title", fields: ["title", "description", "color", "is_completed"] },
    subprojects: { type: "subproject", titleField: "name",  fields: ["name", "description", { name: "linked_sites", type: "json" }] },
};

/**
 * Look up the entity config for a given collection name.
 * @param {string} collectionName
 */
function getEntityConfig(collectionName) {
    return ENTITY_CONFIG[collectionName] ?? null;
}

/**
 * Resolve the project_id for any tracked entity by walking the
 * parent chain of card -> board -> project, section -> board -> project, etc.
 *
 * @param {core.App} app
 * @param {string} collectionName
 * @param {core.Record} record
 * @returns {{ projectId: string | null }}
 */
function resolveEntityInfo(app, collectionName, record) {
    let projectId = null;
    
    if(collectionName === "projects") {
        projectId = record.id;
    } else if(collectionName === "boards") {
        projectId = findProjectContaining(app, "boards", record.id);
    } else if(collectionName === "cards") {
        const boardId = record.getString("board");
        if(boardId) projectId = findProjectContaining(app, "boards", boardId);
    } else if(collectionName === "sections") {
        const boards = app.findRecordsByFilter("boards", "sections ~ {:id}", "", 1, 0, { id: record.id });
        if(boards.length > 0 && boards[0]) projectId = findProjectContaining(app, "boards", boards[0].id);
    } else if(collectionName === "subprojects") {
        projectId = findProjectContaining(app, "subprojects", record.id);
    }
    
    return { projectId: projectId };
}

/**
 * Find the id of the project whose array field `fieldName` contains `recordId`.
 *
 * @param {core.App} app
 * @param {string} fieldName e.g. "boards", "subprojects"
 * @param {string} recordId
 * @returns {string|null}
 */
function findProjectContaining(app, fieldName, recordId) {
    let filter = fieldName + " ~ {:id}";
    let projects = app.findRecordsByFilter("projects", filter, "", 1, 0, { id: recordId });
    return projects.length > 0 ? projects[0]?.id ?? null : null;
}

/**
 * Create an activity_log record.
 *
 * @param {core.App} app
 * @param {Object} params
 * @param {"create" | "update" | "delete"} params.action
 * @param {string} params.entityType e.g. "card", "board", "project"
 * @param {string} params.entityId record id of the changed entity
 * @param {string} params.entityTitle human-readable title (cached)
 * @param {string | null} params.actor user id who performed the action
 * @param {any | null} params.changes changed fields (only for updates or creation)
 * @param {string | null} params.projectId related project id if applicable
 */
function logActivity(app, params) {
    const collection = app.findCollectionByNameOrId("activity_log");
    let record = new Record(collection);
    
    record.set("action", params.action);
    record.set("entity_type", params.entityType);
    record.set("entity_id", params.entityId);
    record.set("entity_title", params.entityTitle);
    
    if(params.actor) record.set("actor", params.actor);
    if(params.changes) record.set("changes", params.changes);
    if(params.projectId) record.set("project_id", params.projectId);
    
    app.save(record);
}

/**
 * Compare an original record with its updated version and return an object
 * describing what changed.  Only fields in the tracked list are compared.
 *
 * @param {core.App} app
 * @param {core.Record} original result of record.original()
 * @param {core.Record} record the current (updated) record
 * @param {TrackedField[]} trackedFields list of fields to compare
 * @returns {EntryChanges} e.g. { title: { old: "foo", new: "bar" } }
 */
function computeChanges(app, original, record, trackedFields) {
    let changes = /** @type {EntryChanges} */ ({});

    /**
     * @param {"normal" | "section" | "assignment" | "json"} type
     * @param {EntryValue} val
     */
    function normalize(type, val) {
        if(type === "json" || type === "assignment") {
            if(typeof val === "string") return { json: JSON.parse(val) };
            const { parseJSON } = /** @type import("./util") */ (require(`${__hooks}/util`));
            return { json: parseJSON(val) };
        }

        if(val === null || val === undefined) return null;
        if(typeof val === "string") return val;

        return String(val);
    }

    /**
     * @param {CardAssignmentData} assignmentData
     * @returns {{ names: string[] }}
     */
    function parseAssignment(assignmentData) {
        // i <3 N+1 queries
        if(assignmentData?.type === "users") {
            const userIds = assignmentData.ids ?? [];
            const userNames = userIds.map((userId) => {
                const userRecord = app.findRecordById("users", userId);
                return userRecord ? userRecord.getString("name") : null;
            }).filter((name) => name !== null);
            return { names: userNames };
        } else if(assignmentData?.type === "groups") {
            const groupIds = assignmentData.ids ?? [];
            const groupNames = groupIds.map((groupId) => {
                const groupRecord = app.findRecordById("groups", groupId);
                return groupRecord ? groupRecord.getString("name") : null;
            }).filter((name) => name !== null);
            return { names: groupNames };
        }
        return { names: [] };
    }
    
    for(let i = 0; i < trackedFields.length; i++) {
        const field = trackedFields[i];
        const fieldName = typeof field === "string" ? field : field.name;
        const oldVal = normalize(typeof field === "string" ? "normal" : field.type, original.getString(fieldName));
        const newVal = normalize(typeof field === "string" ? "normal" : field.type, record.getString(fieldName));
        
        // serialisation for deep comparison
        if(JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            // add extra information for certain fields
            let newData = /** @type { EntryValue } */ (newVal);
            let oldData = /** @type { EntryValue } */ (oldVal);
            if(typeof field !== "string") {
                if(field.type === "section") {
                    const oldSection = typeof oldVal === "string" ? app.findRecordById(
                        "sections", oldVal
                    ) : null;
                    const newSection = typeof newVal === "string" ? app.findRecordById(
                        "sections", newVal
                    ) : null;
                    oldData = oldSection ? {
                        id: /** @type {string} */(oldVal),
                        title: oldSection.getString("title")
                    } : null;
                    newData = newSection ? {
                        id: /** @type {string} */(newVal),
                        title: newSection.getString("title")
                    } : null;
                } else if(field.type === "assignment") {
                    if(oldVal && typeof oldVal === "object" && "json" in oldVal) oldData = {
                        assignment: oldVal.json,
                        ...parseAssignment(oldVal.json)
                    };
                    if(newVal && typeof newVal === "object" && "json" in newVal) newData = {
                        assignment: newVal.json,
                        ...parseAssignment(newVal.json)
                    };
                }
            }
            changes[fieldName] = { old: oldData, new: newData };
        }
    }
    
    return changes;
}

/**
 * Compute a snapshot of the tracked fields of a record, for logging on creation.
 *
 * @param {core.Record} record
 * @param {TrackedField[]} trackedFields list of fields to include in the snapshot
 * @returns {any} e.g. { title: "foo", description: "bar" }
 */
function computeSnapshot(record, trackedFields) {
    let snapshot = /** @type {any} */ ({});
    
    for(let i = 0; i < trackedFields.length; i++) {
        const field = trackedFields[i];
        const fieldName = typeof field === "string" ? field : field.name;
        snapshot[fieldName] = record.get(fieldName);
    }
    
    return snapshot;
}

/**
 * Find the most recent activity_log record for the same entity + action
 * within the merge threshold.
 *
 * @param {core.App} app
 * @param {string} entityType
 * @param {string} entityId
 * @param {"create" | "update" | "delete"} action
 * @returns {core.Record | null}
 */
function findRecentActivity(app, entityType, entityId, action) {
    const activityLogCollection = app.findCollectionByNameOrId("activity_log");
    const records = app.findRecordsByFilter(
        activityLogCollection,
        `entity_type = {:type} && entity_id = {:id} && action = {:action}`,
        "-date",
        1, 0,
        { type: entityType, id: entityId, action: action },
    );
    if(records.length > 0) {
        const mostRecent = records[0];
        if(!mostRecent) return null;
        const mostRecentDate = new Date(mostRecent.getString("date"));
        const thresholdDate = new Date(Date.now() - MERGE_THRESHOLD_MINUTES * 60 * 1000);
        if(mostRecentDate >= thresholdDate) {
            return mostRecent;
        }
    }
    return null;
}

/**
 * Try to merge new update changes into a recent "update" activity_log record for the same
 * entity. Merging keeps the original "old" values and replaces "new" values with the latest,
 * effectively removing the intermediate state
 *
 * @param {core.App} app
 * @param {{ entityType: string, entityId: string, changes: any, actor: string|null }} params
 * @returns {boolean} true if merged into an existing record
 */
function tryMergeUpdate(app, params) {
    let existing = findRecentActivity(app, params.entityType, params.entityId, "update");
    if(!existing) return false;

    const { parseJSON } = /** @type import("./util") */ (require(`${__hooks}/util`));
    let existingChanges = parseJSON(existing.get("changes"));
    let newChanges = params.changes ?? {};

    // keep original "old", overwrite "new" with latest value
    for(let field in newChanges) {
        if(!Object.prototype.hasOwnProperty.call(newChanges, field)) continue;
        if(existingChanges[field]) {
            existingChanges[field].new = newChanges[field].new;
        } else {
            existingChanges[field] = newChanges[field];
        }
    }

    existing.set("changes", existingChanges);
    existing.set("date", new Date().toISOString());
    if(params.actor) existing.set("actor", params.actor);

    app.save(existing);
    return true;
}

/**
 * Try to merge a delete into a recent "update" activity_log record for the same entity.
 * If found, the existing record is converted to a delete (changes cleared) instead of
 * creating a new record.
 *
 * @param {core.App} app
 * @param {{ entityType: string, entityId: string, actor: string|null }} params
 * @returns {boolean} true if merged into an existing record
 */
function tryMergeDelete(app, params) {
    let existing = findRecentActivity(app, params.entityType, params.entityId, "update");
    if(!existing) return false;

    existing.set("action", "delete");
    existing.set("changes", null);
    existing.set("date", new Date().toISOString());
    if(params.actor) existing.set("actor", params.actor);

    app.save(existing);
    return true;
}

module.exports = { getEntityConfig, resolveEntityInfo, logActivity, computeChanges, computeSnapshot, tryMergeUpdate, tryMergeDelete };