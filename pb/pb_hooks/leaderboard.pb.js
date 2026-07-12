/**
 * Leaderboard implementation. We track three counters for each user per project:
 * - tasks completed (moved to a complete category)
 * - tasks created
 * - tasks assigned (someone else assigning a task to a user or their group)
 * We also keep separate global counters that persist through things like project deletion.
 * The leaderboard is mostly just for fun :)
 */

// @ts-check
/// <reference path="../pb_data/types.d.ts" />

// N+1 everywhere but it's okay

onRecordCreateRequest((e) => {
    if(!e.record) return e.next();

    const collectionName = e.record.collection().name;
    if(collectionName !== "cards") return e.next();
    
    try {
        const { updateLeaderboardCounter, resolveAssignedUserIds, parseAssignmentData, isSectionCompleted, getCardProjectId } =
            /** @type {import("./leaderboard")} */ (require(`${__hooks}/leaderboard.js`));

        const creatorId = e.record.getString("created_by") || (e.auth ? e.auth.id : null);
        if(!creatorId) return e.next();

        const projectId = getCardProjectId(e.app, e.record);

        // increment tasks_created for the creator
        updateLeaderboardCounter(e.app, creatorId, projectId, "tasks_created", 1);

        // if the card is in a completed section, increment tasks_completed for assignees
        const sectionId = e.record.getString("section");
        if(sectionId && isSectionCompleted(e.app, sectionId)) {
            const assignmentData = parseAssignmentData(e.record.get("assignment_data"));
            if(assignmentData) {
                const userIds = resolveAssignedUserIds(e.app, assignmentData);
                for(const userId of userIds) {
                    updateLeaderboardCounter(e.app, userId, projectId, "tasks_completed", 1);
                }
            }
        }

        // initial assignment
        const assignmentData = parseAssignmentData(e.record.get("assignment_data"));
        if(assignmentData) {
            const userIds = resolveAssignedUserIds(e.app, assignmentData);
            for(const userId of userIds) {
                updateLeaderboardCounter(e.app, userId, projectId, "tasks_assigned", 1);
            }
        }
    } catch (err) {
        console.error("Error updating leaderboard on card create:", err);
    }

    e.next();
});

onRecordUpdateRequest((e) => {
    if(!e.record) return e.next();

    const collectionName = e.record.collection().name;
    if(collectionName !== "cards") return e.next();
    
    try {
        const { updateLeaderboardCounter, resolveAssignedUserIds, parseAssignmentData, isSectionCompleted, getCardProjectId } =
            /** @type {import("./leaderboard")} */ (require(`${__hooks}/leaderboard.js`));

        const original = e.record.original();
        if(!original) return e.next();

        const projectId = getCardProjectId(e.app, e.record);

        // section changes for completing cards
        const oldSectionId = original.getString("section");
        const newSectionId = e.record.getString("section");

        if(oldSectionId !== newSectionId) {
            const wasCompleted = oldSectionId ? isSectionCompleted(e.app, oldSectionId) : false;
            const nowCompleted = newSectionId ? isSectionCompleted(e.app, newSectionId) : false;

            if(wasCompleted !== nowCompleted) {
                const assignmentData = parseAssignmentData(e.record.get("assignment_data"));
                /** @type {string[]} */
                let userIds = [];
                if(assignmentData) {
                    userIds = resolveAssignedUserIds(e.app, assignmentData);
                }

                // the goal of decrementing on card un-completion is to prevent infinite crediting
                const delta = nowCompleted ? 1 : -1;
                for(const userId of userIds) {
                    updateLeaderboardCounter(e.app, userId, projectId, "tasks_completed", delta);
                }
            }
        }

        // assignment changes
        const oldAssignmentData = parseAssignmentData(original.get("assignment_data"));
        const newAssignmentData = parseAssignmentData(e.record.get("assignment_data"));

        const oldUserIds = oldAssignmentData ? resolveAssignedUserIds(e.app, oldAssignmentData) : [];
        const newUserIds = newAssignmentData ? resolveAssignedUserIds(e.app, newAssignmentData) : [];

        // decrement for users no longer assigned
        for(const userId of oldUserIds) {
            if(!newUserIds.includes(userId)) {
                updateLeaderboardCounter(e.app, userId, projectId, "tasks_assigned", -1);
            }
        }

        // increment for newly assigned users
        for(const userId of newUserIds) {
            if(!oldUserIds.includes(userId)) {
                updateLeaderboardCounter(e.app, userId, projectId, "tasks_assigned", 1);
                if(newSectionId && isSectionCompleted(e.app, newSectionId)) {
                    updateLeaderboardCounter(e.app, userId, projectId, "tasks_completed", 1);
                }
            }
        }
    } catch (err) {
        console.error("Error updating leaderboard on card update:", err);
    }

    e.next();
});

onRecordDeleteRequest((e) => {
    if(!e.record) return e.next();

    const collectionName = e.record.collection().name;
    if(collectionName !== "cards") return e.next();

    const deletingUserId = e.auth?.id;
    if(!deletingUserId) return e.next();

    try {
        const { updateLeaderboardCounter, resolveAssignedUserIds, parseAssignmentData, isSectionCompleted, getCardProjectId } =
            /** @type {import("./leaderboard")} */ (require(`${__hooks}/leaderboard.js`));

        const creatorId = e.record.getString("created_by");
        const projectId = getCardProjectId(e.app, e.record);

        // decrement tasks_created for the creator
        if(creatorId) {
            updateLeaderboardCounter(e.app, creatorId, projectId, "tasks_created", -1);
        }

        // if the card was in a completed section, decrement tasks_completed for assignees
        const sectionId = e.record.getString("section");
        if(sectionId && isSectionCompleted(e.app, sectionId)) {
            const assignmentData = parseAssignmentData(e.record.get("assignment_data"));
            if(assignmentData) {
                const userIds = resolveAssignedUserIds(e.app, assignmentData);
                for(const userId of userIds) {
                    updateLeaderboardCounter(e.app, userId, projectId, "tasks_completed", -1);
                }
            }
        }

        // decrement tasks_assigned for assignees
        const assignmentData = parseAssignmentData(e.record.get("assignment_data"));
        if(assignmentData) {
            const userIds = resolveAssignedUserIds(e.app, assignmentData);
            for(const userId of userIds) {
                updateLeaderboardCounter(e.app, userId, projectId, "tasks_assigned", -1);
            }
        }
    } catch (err) {
        console.error("Error updating leaderboard on card delete:", err);
    }

    e.next();
});

