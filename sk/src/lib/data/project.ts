import type { Component } from "svelte";
import type { BoardsResponse, ProjectsResponse } from "../pocketbase/generated-types";
import type { CardMetadata } from "./cards";
import { CodeXml, Factory, Palette } from "lucide-svelte";

// TODO: This database schema isn't very scalable. We should use back-relations instead of
// forward relations on projects to allow cascade deletion and avoid having to update multiple records

export type TypedProjectsResponse<Expand = {}> = ProjectsResponse<ProjectLinkedSite[], Expand>;
export type TypedBoardsResponse<Expand = {}> = BoardsResponse<CustomCardFields, ProjectLinkedSite[], Expand>;

/** Context object passed to functions that dynamically change metadata */
export type MetadataCtx = {
    board: TypedBoardsResponse;
    metadata: CardMetadata | null
};

export type CardMetadataFieldType<Dynamic extends boolean = true> = {
    base: "text" | "longtext" | "number" | "date" | "checkbox" | "onshape_part" | "url";
} | {
    base: "user" | "group" | "file";
    /** whether the field can have multiple values */
    multi?: boolean;
} | {
    base: "select";
    /** the options for the select field */
    options: {
        id: string;
        value: string;
        color?: string;
    }[] | (
        Dynamic extends true ? ((ctx: MetadataCtx) => { id: string; value: string; color?: string }[]) : never
    );
    allow_other?: boolean;
} | {
    base: "list";
    field: CardMetadataFieldType<Dynamic>;
} | {
    base: "tuple";
    fields: CardMetadataFieldType<Dynamic>[];
};

type MetadataFile = {
    id: string;
    /** Original name of the file */
    name: string;
};
export type MetadataValue = string | number | boolean | MetadataValue[] | MetadataFile | null;

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
    }
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
                    "id" in v && typeof v.id === "string" &&
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

export type CardMetadataField<Dynamic extends boolean = true> = {
    name: string;
    description: string;
    type: CardMetadataFieldType<Dynamic>;
};

export type CustomCardFields = {
    [id: string]: CardMetadataField
};

export type ProjectLinkedSite = {
    name: string;
    url: string;
    icon?: string | "site";
};

export const boardTypes: {
    [key in BoardsResponse["type"]]: {
        icon?: Component;
        name: string;
        description: string;
        fields?: CustomCardFields | ((ctx: MetadataCtx) => CustomCardFields);
    }
} = {
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
                name: "Onshape Part ID",
                description: "The ID of the associated Onshape part",
                type: { base: "onshape_part" }
            },
            "steps": {
                name: "Machining steps",
                description: "The machine the part is to be manufactured on",
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
                } }
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
};

export function getTemplateSections() {
    return [
        { title: "To Do", description: "Items that still need to be done", color: undefined, is_completed: false },
        { title: "In Progress", description: "Items currently being worked on", color: "#fdcb6e", is_completed: false },
        { title: "Completed", description: "Items that have been completed", color: "#00b894", is_completed: true }
    ];
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export function generateRecordID(length = 15) {
    const resultChars: string[] = [];
    const n = ALPHABET.length;
    const maxMultiple = Math.floor(256 / n) * n; // largest multiple of n less than 256

    const bytes = new Uint8Array(1);
    while(resultChars.length < length) {
        crypto.getRandomValues(bytes);
        const v = bytes[0];
        if(v >= maxMultiple) continue; // avoid modulo bias
        resultChars.push(ALPHABET[v % n]);
    }

    return resultChars.join("");
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
                fields: customFieldEntries.map(([id, field]) => ({
                    ...field,
                    id: `user/${id}`,
                    type: materializeMetadataType(field.type, ctx)
                }))
            });
        }
    }

    return sections;
}