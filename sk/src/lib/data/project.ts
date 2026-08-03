import type { Component } from "svelte";
import type { BoardOverviewResponse, BoardsResponse, ProjectOverviewResponse, ProjectsResponse, SubprojectOverviewResponse } from "../pocketbase/generated-types";
import type { CardMetadataField } from "./metadata";
import { CodeXml, Factory } from "@lucide/svelte";
import type { NonNullValuesExcept } from "./kanban";

// TODO: Our database schema isn't very scalable. We should use back-relations instead of
// forward relations on projects to allow cascade deletion and avoid having to update multiple records.
// this would make many of our DB views wayyyyy simpler

export type TypedProjectsResponse<Expand = {}> = ProjectsResponse<ProjectLinkedSite[], Expand>;
export type TypedBoardsResponse<Expand = {}> = BoardsResponse<CustomCardFields, ProjectLinkedSite[], Expand>;

// overviews
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

/**
 * The typed stored in the `custom_card_fields` column of boards.
 */
export type CustomCardFields = {
    [id: string]: CardMetadataField
};

/** A linked site for a project. */
export type ProjectLinkedSite = {
    name: string;
    url: string;
    icon?: string | "site";
};

type ProjectBoardType = {
    icon?: Component;
    name: string;
    description: string;
    fields?: CustomCardFields;
};
export const boardTypesConst = {
    "blank": {
        name: "Blank",
        description: "A blank board with no special features"
    },
    "parts": {
        icon: Factory,
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
        icon: CodeXml,
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
} as const satisfies { [key in BoardsResponse["type"]]: ProjectBoardType };
export const boardTypes: { [key in BoardsResponse["type"]]: ProjectBoardType } = boardTypesConst;

export function getTemplateSections() {
    return [
        { title: "To Do", description: "Items that still need to be done", color: undefined, is_completed: false },
        { title: "In Progress", description: "Items currently being worked on", color: "#fdcb6e", is_completed: false },
        { title: "Completed", description: "Items that have been completed", color: "#00b894", is_completed: true }
    ];
}
