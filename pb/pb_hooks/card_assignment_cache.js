const ASSIGNMENT_CACHE_COLLECTION_ID = "pbc_950263630";

/**
 * @typedef {import('../../sk/src/lib/data/cards.ts').CardAssignmentData} CardAssignmentData
 */

/**
 * Updates the assignment cache for a given card.
 * @param {core.App} app 
 * @param {core.Record} card 
 */
function updateAssignmentCache(app, card) {
    // holy N+1 going on here

    const assignmentsCollection = app.findCollectionByNameOrId(ASSIGNMENT_CACHE_COLLECTION_ID);
    /** @type {import('./util.js')} */
    const { parseJSON } = require(`${__hooks}/util`);

    app.runInTransaction((app) => {
        const currentAssignmentRecords = app.findRecordsByFilter(assignmentsCollection, `card = "${card.id}"`, "created", 0, 0);
        const assignmentData = card.get("assignment_data");
        if(!assignmentData || assignmentData.length === 0) return;
        const cardAssignmentData = /** @type {CardAssignmentData} */ (parseJSON(assignmentData));

        if(!cardAssignmentData || typeof cardAssignmentData !== "object") throw new Error(`Invalid assignment data for card ${card.id}: ${card.get("assignment_data")}`);
        
        let userIds = [];
        let groupIds = [];
        switch(cardAssignmentData.type) {
            case "users":
                userIds = cardAssignmentData.ids;
                break;
            case "groups":
                groupIds = cardAssignmentData.ids;
                break;
            default:
                // no assignments, do nothing
        }

        // if the current assignment records are different from the new assignment data, update the cache
        const currentUserIds = currentAssignmentRecords
            .map((record) => record.get("user"))
            .filter((userId) => userId !== null && userId !== undefined);
        const currentGroupIds = currentAssignmentRecords
            .map((record) => record.get("group"))
            .filter((groupId) => groupId !== null && groupId !== undefined);
        
        const userIdsChanged = currentUserIds.length !== userIds.length || !currentUserIds.every((id) => userIds.includes(id));
        const groupIdsChanged = currentGroupIds.length !== groupIds.length || !currentGroupIds.every((id) => groupIds.includes(id));

        if(userIdsChanged || groupIdsChanged) {
            console.log(`Updating assignment cache for card ${card.id}: users ${JSON.stringify(currentUserIds)} -> ${JSON.stringify(userIds)}, groups ${JSON.stringify(currentGroupIds)} -> ${JSON.stringify(groupIds)}`);

            // delete the current assignment records
            currentAssignmentRecords.forEach((record) => {
                app.delete(record);
            });

            // create new assignment records
            userIds.forEach((userId) => {
                app.save(new Record(assignmentsCollection, {
                    card: card.id,
                    user: userId,
                    group: null
                }));
            });
            groupIds.forEach((groupId) => {
                app.save(new Record(assignmentsCollection, {
                    card: card.id,
                    user: null,
                    group: groupId
                }));
            });
        }
    });
}

module.exports = {
    updateAssignmentCache
};