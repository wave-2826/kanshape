import type { BoardsResponse, ProjectsResponse } from "../pocketbase/generated-types";
import type { CardMetadata } from "./cards";

// TODO: This database schema isn't very scalable. We should use back-relations instead of
// forward relations on projects to allow cascade deletion and avoid having to update multiple records

export type TypedProjectsResponse<Expand = {}> = ProjectsResponse<ProjectLinkedSite[], Expand>;
export type TypedBoardsResponse<Expand = {}> = BoardsResponse<CustomCardFields, ProjectLinkedSite[], Expand>;

/** Context object passed to functions that dynamically change metadata */
export type MetadataCtx = {
    board: TypedBoardsResponse;
    metadata: CardMetadata
};

export type CardMetadataFieldType = {
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
    }[] | ((ctx: MetadataCtx) => { id: string; value: string; color?: string }[]);
    allow_other?: boolean;
} | {
    base: "object";
    fields: {
        [id: string]: {
            label: string;
            type: CardMetadataFieldType;
        }
    },
    /** If true, this object acts like a multi-select formatted as process "steps" */
    steps?: boolean
};

export type CardMetadataField = {
    name: string;
    description: string;
    type: CardMetadataFieldType;
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
                type: { base: "object", steps: true, fields: {
                    type: {
                        label: "Type",
                        type: { base: "select", options: [
                            { id: "3d_printer", value: "3D Printer" },
                            { id: "lathe", value: "Lathe" },
                            { id: "mill", value: "Mill" },
                            { id: "cnc_router", value: "CNC Router" },
                            { id: "bandsaw", value: "Bandsaw" },
                            { id: "laser_cutter", value: "Laser Cutter" },
                            { id: "waterjet", value: "Waterjet" }
                        ], allow_other: true }
                    },
                    description: {
                        label: "Description",
                        type: { base: "text" }
                    }
                } }
            },
            "files": {
                name: "Files",
                description: "Files associated with the part.",
                type: { base: "file", multi: true }
            }
        }
    },
    "software": {
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
    title: string;
    fields: ({
        id: string;
    } & CardMetadataField)[];
}

/**
 * Gets the schema for all non-essential card metadata fields.  
 * Metadata is stored with type for if the schema ever changes.  
 * Note that this does NOT include built-in special fields like assignments, due dates, etc.
 * that have separate database fields for easier querying and display.
 * 
 * @param board The board to get the metadata items for
 * @param includeCustom Whether to include custom metadata fields
 *  Can be turned off to e.g. get all the builtin board-specific fields for display.
 */
export function getCardMetadataItems(
    board: TypedBoardsResponse,
    includeCustom: boolean = true
): CardMetadataSection[] {
    const sections: CardMetadataSection[] = [];

    // Board type fields
    const typeInfo = boardTypes[board.type];
    if(typeInfo) {
        const typeFields = typeInfo.fields || {};
        const typeFieldEntries = Object.entries(typeFields);
        if(typeFieldEntries.length > 0) {
            sections.push({
                title: typeInfo.name,
                fields: typeFieldEntries.map(([id, field]) => ({ id: `${board.type}/${id}`, ...field }))
            });
        }
    }

    if(includeCustom) {
        const customFields = board.custom_card_fields || {};
        const customFieldEntries = Object.entries(customFields);
        if(customFieldEntries.length > 0) {
            sections.push({
                title: "Board Fields",
                fields: customFieldEntries.map(([id, field]) => ({ id: `user/${id}`, ...field }))
            });
        }
    }

    return sections;
}