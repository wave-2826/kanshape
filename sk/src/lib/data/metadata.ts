/**
 * Card metadata is a (poorly named) term for additional fields that can be placed on cards by users
 * and that certain board types provide by default.
 */

import type { Component } from "svelte";
import { boardTypes, type TypedBoardsResponse } from "./project";
import { Palette } from "lucide-svelte";
import type { PartExportType } from "./parts";
import type { CreationPart } from "$lib/components/parts/partData";
import type { TypedCardsCreate, TypedCardsResponse } from "./cards";

/**
 * A symbol to indicate ""something"" is being actively created (e.g. a card being made that hasn't been
 * stored yet) in a metadata field. Just makes it simpler to immediately see that something's wrong if that
 * ever leaks out.
 */
export const CREATE_SYMBOL = Symbol("create");

/**
 * The type of a metadata field / custom board field.
 */
export type CardMetadataFieldType = {
    base: "empty" | "text" | "longtext" | "number" | "date" | "checkbox" | "onshape_part" | "url";
} | {
    base: "user" | "group";
    /** whether the field can have multiple values */
    multi?: boolean;
} | {
    base: "file";
    /** whether the field can have multiple values */
    multi?: boolean;
} | {
    base: "select";
    /** the options for the select field */
    options: {
        id: string;
        /** label for the option, used in the UI */
        value: string;
        color?: string;
    }[];
    allow_other?: boolean;
} | {
    base: "list";
    field: CardMetadataFieldType;
    /** optional name for the field, used in the UI */
    fieldName?: string;
} | {
    base: "tuple";
    fields: CardMetadataFieldType[];
} | {
    // Used only when creating a new card, to indicate that the value shouldn't persist
    // maybe not the best solution but it's a pain to pass two sets of types everywhere
    // this is a symbol to make sure it's obvious something is very wrong if this ever tries
    // to be persisted
    base: typeof CREATE_SYMBOL;
    create: "onshape_part";
};

/**
 * A part an export being created is for. Either an existing part record or another part being
 * created (in which case internal id references its internalId)
 */
export type CreationExportPartTarget = { record: string } | { internalId: string };
export type MetadataFile = {
    id: string;
    /** Original name of the file */
    name: string;
    /** if present, this is a special type of file (only a visual difference) */
    type?: "export" | "auto_export";
    /** present if an export: the ID of the part record associated with this export. */
    partRecordId?: string;
} | {
    // Used when creating a new card
    id: typeof CREATE_SYMBOL,
    name: string;
    createType: "export" | "auto_export";
    /**
     * The part this export being created is for. Either an existing part record or another part being
     * created (in which case internal id references its internalId)
     */
    forPart: CreationExportPartTarget;
    exportType: PartExportType;
};
/**
 * The value of a metadata field / custom card field.  
 * This could potentially be more strongly typed if tied to the field types, but that makes everything
 * more painful and we need to do type checking anyway to be robust against incorrect stored values.
 */
export type MetadataValue = string | number | boolean | MetadataValue[] | MetadataFile | CreationPart | null;

/**
 * The actual data stored in the `metadata` column of cards.
 */
export type CardMetadata = {
    [id: string]: {
        /** The value of the metadata field */
        value: MetadataValue;
        /** The metadata type is stored on the field to stay valid after schema changes */
        type: CardMetadataFieldType;
    };
};

/**
 * Get the default value for a metadata field based on its type.
 */
export function defaultMetadataFieldValue(type: CardMetadataFieldType): MetadataValue {
    switch(type.base) {
        case "text":
        case "longtext":
        case "url":
            return "";
        case "number":
            return 0;
        case "date":
            return null;
        case "checkbox":
            return false;
        case "onshape_part":
            return null;
        case "user":
        case "group":
        case "file":
            return type.multi ? [] : null;
        case "select":
            return type.options.length > 0 ? type.options[0].id : (type.allow_other ? "" : null);
        case "list":
            return [defaultMetadataFieldValue(type.field)];
        case "tuple":
            return type.fields.map(f => defaultMetadataFieldValue(f));
        case CREATE_SYMBOL:
            if(type.create === "onshape_part") return null;
        }
        return null;
}

/**
 * Check if a value is compartible with the given field type. If not, the stored old type should
 * be used and a warning should be displayed.
 */
export function checkMetadataValue(type: CardMetadataFieldType, value: MetadataValue): boolean {
    switch(type.base) {
        case "text":
        case "longtext":
        case "url":
            return typeof value === "string";
        case "number":
            return typeof value === "number";
        case "date":
            return value === null || typeof value === "string";
        case "checkbox":
            return typeof value === "boolean";
        case "onshape_part":
            return value === null || typeof value === "string";
        case "user":
        case "group":
            if(type.multi) {
                return Array.isArray(value) && value.every(v => typeof v === "string");
            } else {
                return value === null || typeof value === "string";
            }
        case "file":
            function isFile(v: MetadataValue): v is MetadataFile {
                return typeof v === "object" && v !== null &&
                    "id" in v && (typeof v.id === "string" || v.id === CREATE_SYMBOL) &&
                    "name" in v && typeof v.name === "string";
            }
            if(type.multi) {
                return Array.isArray(value) && value.every(isFile);
            } else {
                return value === null || isFile(value);
            }
        case "select":
            if(type.allow_other) {
                return typeof value === "string";
            } else {
                return type.options.some(o => o.id === value);
            }
        case "list":
            return Array.isArray(value) && value.every(v => checkMetadataValue(type.field, v));
        case "tuple":
            return Array.isArray(value) && value.length === type.fields.length && value.every(
                (v, i) => checkMetadataValue(type.fields[i], v)
            );
        default:
            return false;
    }
}

/** Walk through a metadata value and run the callback recursively on all values. */
export function walkMetadataValues(
    type: CardMetadataFieldType,
    value: MetadataValue,
    callback: (type: CardMetadataFieldType, value: MetadataValue) => void
) {
    if(!type) return;
    
    callback(type, value);

    switch(type.base) {
        case "list":
            if(Array.isArray(value)) {
                for(const v of value) {
                    walkMetadataValues(type.field, v, callback);
                }
            }
            break;
        case "tuple":
            if(Array.isArray(value)) {
                for(let i = 0; i < type.fields.length; i++) {
                    walkMetadataValues(type.fields[i], value[i], callback);
                }
            }
            break;
    }
}
/** Walk through all of a card's metadata and run the callback recursively on all values. */
export function walkMetadata(
    card: TypedCardsResponse | TypedCardsCreate,
    callback: (type: CardMetadataFieldType, value: MetadataValue) => void
) {
    if(card.metadata) for(const [k, v] of Object.entries(card.metadata)) {
        walkMetadataValues(v.type, v.value, callback);
    }
}

/** A container for a metadata type/value pair */
type MetadataNode = {
    type: CardMetadataFieldType;
    value: MetadataValue;
};
/** Walks through a metadata tree and allows transforming it asynchronously. */
export async function transformMetadata(
    type: CardMetadataFieldType,
    value: MetadataValue,
    callback: (node: MetadataNode) => MetadataNode | Promise<MetadataNode>
): Promise<MetadataNode> {
    if(!type) return { type, value };
    
    ({ type, value } = await callback({ type, value }));
    
    switch(type.base) {
        case "list":
            if(Array.isArray(value)) {
                const field = type.field;
                const items = await Promise.all(value.map(async (v) =>
                    await transformMetadata(field, v, callback)
                ));

                type = {
                    ...type,
                    field: items[0]?.type ?? type.field,
                };
                value = items.map(i => i.value);
            }
            break;
        case "tuple":
            if(Array.isArray(value)) {
                const v = value;
                const items = await Promise.all(type.fields.map(async (field, i) =>
                    await transformMetadata(field, v[i], callback)
                ));

                type = {
                    ...type,
                    fields: items.map(i => i.type),
                };
                value = items.map(i => i.value);
            }
            break;
    }

    return { type, value };
}

/**
 * Data for a metadata field on a board.
 */
export type CardMetadataField = {
    name: string;
    description: string;
    type: CardMetadataFieldType;
    allowsClearing?: boolean;
    unknown?: boolean;
};

/**
 * Gets metadata items on a card that aren't part of the board's custom fields.
 * These "extra" items are still displayed so data isn't lost.
 */
export function getExtraMetadataItems(
    metadataItems: CardMetadataSection[],
    cardMetadata: CardMetadata | null
): ({ id: string; } & CardMetadataField)[] {
    const knownFieldIds = new Set<string>();
    for (const section of metadataItems) {
        for (const field of section.fields) {
            knownFieldIds.add(field.id);
        }
    }

    const extraItems: ({ id: string; } & CardMetadataField)[] = [];
    if (cardMetadata) {
        for (const [id, item] of Object.entries(cardMetadata)) {
            if (!knownFieldIds.has(id)) {
                extraItems.push({
                    id,
                    name: `${id} (unknown field)`,
                    description: "This field is not part of the board's schema. It may have been removed or renamed.",
                    type: item.type,
                    unknown: true
                });
            }
        }
    }

    return extraItems;
}

export type CardMetadataSection = {
    icon?: Component;
    title: string;
    fields: ({
        id: string;
    } & CardMetadataField)[];
};

/**
 * Gets the schema for all non-essential card metadata fields.
 * Metadata is stored with type for if the schema ever changes.
 * Note that this does NOT include built-in special fields like assignments, due dates, etc.
 * that have separate database fields for easier querying and display.
 *
 * @param board The board to get the metadata items for
 */
export function getCardMetadataItems(board: TypedBoardsResponse): CardMetadataSection[] {
    const sections: CardMetadataSection[] = [];

    // Board type fields
    const typeInfo = boardTypes[board.type];
    if (typeInfo) {
        let typeFields = typeInfo.fields || {};

        const typeFieldEntries = Object.entries(typeFields);
        if (typeFieldEntries.length > 0) {
            sections.push({
                icon: typeInfo.icon,
                title: typeInfo.name,
                fields: typeFieldEntries.map(([id, field]) => ({
                    ...field,
                    id: `${board.type}/${id}`,
                    type: field.type
                }))
            });
        }
    }

    const customFields = board.custom_card_fields || {};
    const customFieldEntries = Object.entries(customFields);
    if (customFieldEntries.length > 0) {
        sections.push({
            icon: Palette as unknown as Component, // sure...
            title: "Board Fields",
            fields: customFieldEntries.map(([id, field]) => {
                return {
                    ...field,
                    id: `user/${id}`,
                    type: field.type,
                    // a little hacky, maybe, but not the worst
                    allowsClearing: field.type.base === "onshape_part"
                };
            })
        });
    }

    return sections;
}