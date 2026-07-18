// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

onRecordAfterUpdateSuccess((e) => {
    try {
        const { getReferencedParts, removePartReference } = /** @type {import('./metadata_parts')} */(require(`${__hooks}/onshape/metadata_parts`));
        const original = e.record?.original();
        if(!e.record || !original) return e.next();
        
        let oldPartsReferenced = getReferencedParts(original);
        let newPartsReferenced = getReferencedParts(e.record);

        console.log("Card metadata updated. Old part references: ", JSON.stringify(oldPartsReferenced), " New part references: ", JSON.stringify(newPartsReferenced));

        for(const partId of oldPartsReferenced) {
            if(!newPartsReferenced.includes(partId)) {
                console.log(`Removing reference to part ${partId} from card ${e.record.id}`);
                removePartReference(e.app, partId, e.record.id);
            }
        }
    } catch(e) {
        console.warn("Error updating parts from card metadata:", e);
    }

    return e.next();
}, "cards");

onRecordAfterDeleteSuccess((e) => {
    try {
        const { getReferencedParts, checkPartDeletion } = /** @type {import('./metadata_parts')} */(require(`${__hooks}/onshape/metadata_parts`));
        if(!e.record) return e.next();

        const partsReferenced = getReferencedParts(e.record);
        for(const partId of partsReferenced) {
            checkPartDeletion(e.app, partId);
        }
    } catch(e) {
        console.warn("Error updating parts from card metadata:", e);
    }

    return e.next();
}, "cards");