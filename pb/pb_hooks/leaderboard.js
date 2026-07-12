// @ts-check
/// <reference path="../pb_data/types.d.ts" />

/**
 * @typedef {import('../../sk/src/lib/data/cards.ts').CardAssignmentData} CardAssignmentData
 */

/**
 * Get or create a leaderboard record for a user and project.
 * If projectId is null, gets/creates the global record.
 *
 * @param {core.App} app
 * @param {string} userId
 * @param {string | null} projectId
 * @returns {core.Record}
 */
function getOrCreateLeaderboardRecord(app, userId, projectId) {
    let records;
    if(projectId) {
        records = app.findRecordsByFilter(
            "leaderboard",
            "user = {:user} && project = {:project}",
            "", 1, 0,
            { user: userId, project: projectId }
        );
    } else {
        records = app.findRecordsByFilter(
            "leaderboard",
            "user = {:user} && project = null",
            "", 100, 0,
            { user: userId }
        );
    }

    if(records.length > 0) {
        // For global records, merge any duplicates and keep the first one
        if(!projectId && records.length > 1) {
            const keep = records[0];
            if(!keep) return getOrCreateLeaderboardRecord(app, userId, null); // shouldn't happen?
            
            for(let i = 1; i < records.length; i++) {
                const dup = records[i];
                if(!dup) continue;

                keep.set("tasks_completed", (keep.getFloat("tasks_completed") || 0) + (dup.getFloat("tasks_completed") || 0));
                keep.set("tasks_created", (keep.getFloat("tasks_created") || 0) + (dup.getFloat("tasks_created") || 0));
                keep.set("tasks_assigned", (keep.getFloat("tasks_assigned") || 0) + (dup.getFloat("tasks_assigned") || 0));
                app.delete(dup);
            }

            app.save(keep);
            return keep;
        }

        const record = records[0];
        if(record) return record;
    }

    // Create new record
    const collection = app.findCollectionByNameOrId("leaderboard");

    const record = new Record(collection);
    record.set("user", userId);
    if(projectId) record.set("project", projectId);

    record.set("tasks_completed", 0);
    record.set("tasks_created", 0);
    record.set("tasks_assigned", 0);

    app.save(record);
    return record;
}

/**
 * Update the value of a counter field on leaderboard records for a user.
 * Updates both the user's per-project and global record.
 *
 * @param {core.App} app
 * @param {string} userId
 * @param {string | null} projectId
 * @param {"tasks_completed" | "tasks_created" | "tasks_assigned"} field
 * @param {number} delta
 */
function updateLeaderboardCounter(app, userId, projectId, field, delta = 1) {
    if(delta === 0) return;

    // Update per-project record
    if(projectId) {
        const projectRecord = getOrCreateLeaderboardRecord(app, userId, projectId);
        const current = projectRecord.getFloat(field) || 0;
        projectRecord.set(field, Math.max(0, current + delta));
        app.save(projectRecord);
    }

    // Update global record
    const globalRecord = getOrCreateLeaderboardRecord(app, userId, null);
    const current = globalRecord.getFloat(field) || 0;
    globalRecord.set(field, Math.max(0, current + delta));
    app.save(globalRecord);
}

/**
 * Parse assignment_data from a record
 * 
 * @param {any} raw raw value from record.get("assignment_data")
 * @returns {CardAssignmentData | null}
 */
function parseAssignmentData(raw) {
    if(!raw) return null;
    
    if(typeof raw === "object" && raw.byteLength === undefined && !Array.isArray(raw)) {
        return raw;
    }
    
    if(typeof raw === "string") {
        try { return JSON.parse(raw); } catch { return null; }
    }
    
    try {
        const { parseJSON } = /** @type {import("./util")} */ (require(`${__hooks}/util.js`));
        return parseJSON(raw);
    } catch { return null; }
}

/**
 * Resolve assignment data to a list of user IDs, excluding the assigning user.
 * Handles both direct user assignments and resolving group members for group assignments.
 *
 * @param {core.App} app
 * @param {CardAssignmentData} assignmentData
 * @returns {string[]} list of user IDs
 */
function resolveAssignedUserIds(app, assignmentData) {
    if(!assignmentData || typeof assignmentData !== "object") return [];

    if(assignmentData.type === "users" && Array.isArray(assignmentData.ids)) {
        return [...assignmentData.ids];
    }

    if(assignmentData.type === "groups" && Array.isArray(assignmentData.ids)) {
        /** @type {Set<string>} */
        const userIds = new Set();
        for(const groupId of assignmentData.ids) {
            // i <3 N+1
            const members = app.findRecordsByFilter(
                "users",
                "groups ~ {:groupId}",
                "", 100, 0,
                { groupId: groupId }
            );
            for(const member of members) {
                if(member) userIds.add(member.id);
            }
        }
        return [...userIds];
    }

    // "anyone_on" and "looking_for_assignment" don't assign specific users
    return [];
}

/**
 * Check if a section is marked as completed.
 *
 * @param {core.App} app
 * @param {string} sectionId
 * @returns {boolean}
 */
function isSectionCompleted(app, sectionId) {
    if(!sectionId) return false;
    const section = app.findRecordById("sections", sectionId);
    return section ? section.getBool("is_completed") : false;
}

/**
 * Get the project ID for a card by looking up which project contains its board.
 *
 * @param {core.App} app
 * @param {core.Record} card
 * @returns {string|null}
 */
function getCardProjectId(app, card) {
    const boardId = card.getString("board");
    if(!boardId) return null;
    const projects = app.findRecordsByFilter(
        "projects",
        "boards ~ {:id}",
        "", 1, 0,
        { id: boardId }
    );
    return projects.length > 0 ? (projects[0]?.id ?? null) : null;
}

module.exports = {
    getOrCreateLeaderboardRecord,
    updateLeaderboardCounter,
    parseAssignmentData,
    resolveAssignedUserIds,
    isSectionCompleted,
    getCardProjectId,
};

