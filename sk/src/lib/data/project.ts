import type { BoardsResponse, ProjectsResponse, ProjectsTypeOptions } from "../pocketbase/generated-types";

// TODO: This database schema isn't very scalable. We should use back-relations instead of
// forward relations on projects to allow cascade deletion and avoid having to update multiple records

export type TypedProjectsResponse<Expand = {}> = ProjectsResponse<ProjectLinkedSite[], Expand>;
export type TypedBoardsResponse<Expand = {}> = BoardsResponse<CustomCardFields, ProjectLinkedSite[], Expand>;

export type CustomCardFields = {
    [id: string]: never
};

export type ProjectLinkedSite = {
    name: string;
    url: string;
    icon?: string | "site";
};

export const projectTypes: {
    [key in ProjectsTypeOptions]: {
        name: string;
        description: string;
    }
} = {
    "blank": {
        name: "Blank",
        description: "Miscellaneous project type with no special features"
    },
    "manufacturing": {
        name: "Manufacturing",
        description: "Allows configuring part IDs"
    }
};

export const boardTypes: {
    [key in BoardsResponse["type"]]: {
        name: string;
        description: string;
    }
} = {
    "blank": {
        name: "Blank",
        description: "A blank board with no special features"
    },
    "parts": {
        name: "Parts board",
        description: "A board for manufacturing part tasks. Boards of this type are defaulted to when adding parts from Onshape and associate part IDs with all cards."
    },
    "software": {
        name: "Software board",
        description: "A board for software development tasks. Tasks can be linked to pull requests, issues, and commits from Git platforms like Github."
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