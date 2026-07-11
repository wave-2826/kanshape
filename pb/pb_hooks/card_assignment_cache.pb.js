/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
    e.next();

    /** @type {import('./card_assignment_cache')} */
    const { updateAssignmentCache } = (require(`${__hooks}/card_assignment_cache`));
    try {
        updateAssignmentCache(e.app, e.record);
    } catch(err) {
        console.error("Error updating assignment cache for card:", e.record.id, err);
    }
}, "cards");
onRecordAfterUpdateSuccess((e) => {
    e.next();

    /** @type {import('./card_assignment_cache')} */
    const { updateAssignmentCache } = (require(`${__hooks}/card_assignment_cache`));
    try {
        updateAssignmentCache(e.app, e.record);
    } catch(err) {
        console.error("Error updating assignment cache for card:", e.record.id, err);
    }
}, "cards");
// cascade delete handles record deletion