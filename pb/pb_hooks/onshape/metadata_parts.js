// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

/**
 * @typedef {import('../../../sk/src/lib/data/cards').CardMetadata} CardMetadata
 */

/**
 * Walk through all metadata values of a given type, including nested in containers.
 * @param {CardMetadata} metadata 
 * @param {CardMetadata[string]["type"]["base"]} leafType
 * @param {(value: CardMetadata[string]["value"], type: CardMetadata[string]["type"]) => void} callback
 */
function walkMetadata(metadata, leafType, callback) {
    /**
     * @param {CardMetadata[string]["value"]} value 
     * @param {CardMetadata[string]["type"]} type 
     */
    function walk(value, type) {
        if(type.base === "list") {
            if(!Array.isArray(value)) return;
            for(let i = 0; i < value.length; i++) {
                walk(value[i], type.field);
            }
        } else if(type.base === "tuple") {
            if(!Array.isArray(value)) return;
            for(let i = 0; i < value.length; i++) {
                walk(value[i], type.fields[i]);
            }
        }

        if(type.base === leafType) callback(value, type);
    }

    for(const key in metadata) {
        const { value, type } = metadata[key];
        walk(value, type);
    }
}

/**
 * Get the part records referenced by a card's metadata.
 * @param {core.Record} record
 * @returns {string[]}
 */
function getReferencedParts(record) {
    const { parseJSON } = /** @type {import('../util')} */(require(`${__hooks}/util`));
    const metadata = /** @type {CardMetadata} */(parseJSON(record.get("metadata")));

    if(!metadata) return [];

    /** @type {string[]} */
    const referencedParts = [];
    walkMetadata(metadata, "onshape_part", (value) => {
        if(typeof value !== "string") return;
        referencedParts.push(value);
    });

    return referencedParts;
}

/**
 * Removes references to a card from a given part.  
 * When all references to a part are removed, the part will be deleted.
 * @param {core.App} app
 * @param {string} partId 
 * @param {string} cardId 
 */
function removePartReference(app, partId, cardId) {
    const part = app.findRecordById("parts", partId);
    if(!part) return;

    const currentCard = part.get("current_card");
    const oldCards = /** @type string[] */(part.get("past_revision_cards"));

    if(currentCard === cardId) {
        part.set("current_card", null);
        app.save(part);
    } else if(oldCards && oldCards.includes(cardId)) {
        part.set("past_revision_cards", oldCards.filter(id => id !== cardId));
        app.save(part);
    }

    checkPartDeletion(app, partId);
}

/**
 * Checks if a part has no card references and should be deleted.
 * @param {core.App} app
 * @param {string} partId 
 */
function checkPartDeletion(app, partId) {
    const part = app.findRecordById("parts", partId);
    if(!part) return;

    const currentCard = part.get("current_card");
    const oldCards = part.get("past_revision_cards");
    
    if(!currentCard && (!oldCards || oldCards.length === 0)) {
        // No references left, delete the part
        app.delete(part);
    }
}

module.exports = {
    getReferencedParts,
    removePartReference,
    checkPartDeletion
};