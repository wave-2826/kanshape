import type { Component } from "svelte";
import type { BoardOverviewResponse, BoardsResponse, ProjectOverviewResponse, ProjectsResponse, SubprojectOverviewResponse } from "../pocketbase/generated-types";
import type { CardMetadata, TypedCardsCreate, TypedCardsResponse } from "./cards";
import { CodeXml, Factory, Palette } from "lucide-svelte";
import type { NonNullValuesExcept } from "./kanban";
import type { CreationPart } from "$lib/components/parts/partData";
import type { PartExportType } from "./parts";

// TODO: This database schema isn't very scalable. We should use back-relations instead of
// forward relations on projects to allow cascade deletion and avoid having to update multiple records

export type TypedProjectsResponse<Expand = {}> = ProjectsResponse<ProjectLinkedSite[], Expand>;
export type TypedBoardsResponse<Expand = {}> = BoardsResponse<CustomCardFields, ProjectLinkedSite[], Expand>;
export type TypedProjectOverviewResponse = NonNullValuesExcept<ProjectOverviewResponse<
    { id: string; title: string }[], // boards
    number, // card_count
    number, // finished_card_count
    string | null, // next_due
    number, // overdue_card_count
    { id: string; name: string }[] // subprojects
>, "next_due">;
export type TypedBoardOverviewResponse = NonNullValuesExcept<BoardOverviewResponse<
    number, // card_count
    number, // finished_card_count
    string | null, // next_due
    number // overdue_card_count
>, "next_due">;
export type TypedSubprojectOverviewResponse = NonNullValuesExcept<SubprojectOverviewResponse<
    number, // card_count
    number, // finished_card_count
    string | null, // next_due
    number // overdue_card_count
>, "next_due">;

// TODO: most of this metadata stuff is definitely more cards than projects

/** Context object passed to functions that dynamically change metadata */
export type MetadataCtx = {
    board: TypedBoardsResponse;
    metadata: CardMetadata | null
};

export const CREATE_SYMBOL = Symbol("create");
export type CardMetadataFieldType<Dynamic extends boolean = true> = {
    base: "text" | "longtext" | "number" | "date" | "checkbox" | "onshape_part" | "url";
} | {
    base: "user" | "group";
    /** whether the field can have multiple values */
    multi?: boolean;
}| {
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
    }[] | (
        Dynamic extends true ? ((ctx: MetadataCtx) => { id: string; value: string; color?: string }[]) : never
    );
    allow_other?: boolean;
} | {
    base: "list";
    field: CardMetadataFieldType<Dynamic>;
    /** optional name for the field, used in the UI */
    fieldName?: string;
} | {
    base: "tuple";
    fields: CardMetadataFieldType<Dynamic>[];
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
export type MetadataValue = string | number | boolean | MetadataValue[] | MetadataFile | CreationPart | null;

export function defaultMetadataFieldValue(type: CardMetadataFieldType<false>): MetadataValue {
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
 * Checks if a value is compartible with the given field type. If not, the stored old type should
 * be used and a warning should be displayed.
 */
export function checkMetadataValue(type: CardMetadataFieldType<false>, value: MetadataValue): boolean {
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

export function walkMetadataValues(
    type: CardMetadataFieldType<false>,
    value: MetadataValue,
    callback: (type: CardMetadataFieldType<false>, value: MetadataValue) => void
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

export function walkMetadata(
    card: TypedCardsResponse | TypedCardsCreate,
    callback: (type: CardMetadataFieldType<false>, value: MetadataValue) => void
) {
    if(card.metadata) for(const [k, v] of Object.entries(card.metadata)) {
        walkMetadataValues(v.type, v.value, callback);
    }
}

type MetadataNode = {
    type: CardMetadataFieldType<false>;
    value: MetadataValue;
};

export async function transformMetadata(
    type: CardMetadataFieldType<false>,
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

export type CardMetadataField<Dynamic extends boolean = true> = {
    name: string;
    description: string;
    type: CardMetadataFieldType<Dynamic>;
    allowsClearing?: boolean;
    unknown?: boolean;
};

export type CustomCardFields = {
    [id: string]: CardMetadataField<false>
};

export type ProjectLinkedSite = {
    name: string;
    url: string;
    icon?: string | "site";
};

export const boardTypesConst = {
    "blank": {
        name: "Blank",
        description: "A blank board with no special features"
    },
    "parts": {
        icon: Factory as unknown as Component, // sure...
        name: "Parts board",
        description: "A board for manufacturing part tasks. Boards of this type are defaulted to when adding parts from Onshape and associate part IDs with all cards.",
        fields: {
            "onshape_part_id": {
                name: "Linked part or assembly",
                description: "The associated Onshape part or assembly",
                allowsClearing: true,
                type: { base: "onshape_part" }
            },
            "steps": {
                name: "Machining steps",
                description: "The machining steps required to manufature this part",
                type: { base: "list", field: {
                    base: "tuple",
                    fields: [
                        { base: "select", options: [
                            { id: "3d_printer", value: "3D Printer" },
                            { id: "lathe", value: "Lathe" },
                            { id: "mill", value: "Mill" },
                            { id: "cnc_router", value: "CNC Router" },
                            { id: "bandsaw", value: "Bandsaw" },
                            { id: "laser_cutter", value: "Laser Cutter" },
                            { id: "waterjet", value: "Waterjet" }
                        ], allow_other: true },
                        { base: "text" }
                    ]
                }, fieldName: "step" }
            },
            "files": {
                name: "Files",
                description: "Files associated with the part.",
                type: { base: "file", multi: true }
            },
            "instructions": {
                name: "Further instructions",
                description: "Any additional instructions for the part.",
                type: { base: "longtext" }
            }
        }
    },
    "software": {
        icon: CodeXml as unknown as Component, // sure...
        name: "Software board",
        description: "A board for software development tasks. Tasks can be linked to pull requests, issues, and commits from Git platforms like Github.",
        fields: {
            "link": {
                name: "Link",
                description: "A link to the associated issue, pull request, commit, or other relevant webpage",
                type: { base: "url" }
            }
        }
    }
} as const satisfies {
    [key in BoardsResponse["type"]]: {
        icon?: Component;
        name: string;
        description: string;
        fields?: CustomCardFields | ((ctx: MetadataCtx) => CustomCardFields);
    }
};
export const boardTypes: {
    [key in BoardsResponse["type"]]: {
        icon?: Component;
        name: string;
        description: string;
        fields?: CustomCardFields | ((ctx: MetadataCtx) => CustomCardFields);
    }
} = boardTypesConst;

export function getTemplateSections() {
    return [
        { title: "To Do", description: "Items that still need to be done", color: undefined, is_completed: false },
        { title: "In Progress", description: "Items currently being worked on", color: "#fdcb6e", is_completed: false },
        { title: "Completed", description: "Items that have been completed", color: "#00b894", is_completed: true }
    ];
}

export type CardMetadataSection = {
    icon?: Component;
    title: string;
    fields: ({
        id: string;
    } & CardMetadataField<false>)[];
};

function materializeMetadataType(type: CardMetadataFieldType, ctx: MetadataCtx): CardMetadataFieldType<false> {
    if(type.base === "tuple") {
        return {
            ...type,
            fields: type.fields.map(f => materializeMetadataType(f, ctx))
        };
    } else if(type.base === "select") {
        return {
            ...type,
            options: typeof type.options === "function" ? type.options(ctx) : type.options
        };
    } else if(type.base === "list") {
        return {
            ...type,
            field: materializeMetadataType(type.field, ctx)
        };
    }

    return type;
}

/**
 * Gets the schema for all non-essential card metadata fields.  
 * Metadata is stored with type for if the schema ever changes.  
 * Note that this does NOT include built-in special fields like assignments, due dates, etc.
 * that have separate database fields for easier querying and display.  
 * 
 * The returned sections are "materialized" (I guess?), meaning they won't have any
 * dynamic functions.
 * 
 * @param board The board to get the metadata items for
 * @param includeCustom Whether to include custom metadata fields
 *  Can be turned off to e.g. get all the builtin board-specific fields for display.
 */
export function getCardMetadataItems(
    board: TypedBoardsResponse,
    ctx: MetadataCtx,
    includeCustom: boolean = true,
): CardMetadataSection[] {
    const sections: CardMetadataSection[] = [];

    // Board type fields
    const typeInfo = boardTypes[board.type];
    if(typeInfo) {
        let typeFields = typeInfo.fields || {};
        if(typeof typeFields === "function") typeFields = typeFields(ctx);

        const typeFieldEntries = Object.entries(typeFields);
        if(typeFieldEntries.length > 0) {
            sections.push({
                icon: typeInfo.icon,
                title: typeInfo.name,
                fields: typeFieldEntries.map(([id, field]) => ({
                    ...field,
                    id: `${board.type}/${id}`,
                    type: materializeMetadataType(field.type, ctx)
                }))
            });
        }
    }

    if(includeCustom) {
        const customFields = board.custom_card_fields || {};
        const customFieldEntries = Object.entries(customFields);
        if(customFieldEntries.length > 0) {
            sections.push({
                icon: Palette as unknown as Component, // sure...
                title: "Board Fields",
                fields: customFieldEntries.map(([id, field]) => {
                    const materializedType = materializeMetadataType(field.type, ctx);
                    return {
                        ...field,
                        id: `user/${id}`,
                        type: materializedType,
                        // a little hacky, maybe, but not the worst
                        allowsClearing: materializedType.base === "onshape_part"
                    };
                })
            });
        }
    }

    return sections;
}

/**
 * Gets metadata items on a card that aren't part of the board's schema.  
 * These "extra" items are still displayed so data isn't lost.
 */
export function getExtraMetadataItems(
    metadataItems: CardMetadataSection[],
    cardMetadata: CardMetadata | null
): ({ id: string } & CardMetadataField<false>)[] {
    const knownFieldIds = new Set<string>();
    for(const section of metadataItems) {
        for(const field of section.fields) {
            knownFieldIds.add(field.id);
        }
    }

    const extraItems: ({ id: string } & CardMetadataField<false>)[] = [];
    if(cardMetadata) {
        for(const [id, item] of Object.entries(cardMetadata)) {
            if(!knownFieldIds.has(id)) {
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