import type { CardsPriorityOptions, CardsResponse } from "$lib/pocketbase/generated-types";
import type { CardMetadataFieldType } from "./project";

export type TypedCardsResponse<Expand = {}> = CardsResponse<CardAssignmentData, CardMetadata, Expand>;

export const priorities: { [key in CardsPriorityOptions]: {
    label: string;
    color: string;
} } = {
    low: { label: "Low", color: "var(--text-secondary)" },
    medium: { label: "Medium", color: "var(--warning-medium)" },
    high: { label: "High", color: "var(--warning-high)" },
    critical: { label: "Critical", color: "var(--error)" }
};

export function getPriorityColor(priority: CardsPriorityOptions) {
    return priorities[priority]?.color ?? "inherit";
}

export type AnyoneOnAssignmentData = {
    type: "anyone_on";
    // UTC ISO date string
    on_date: string;
}

export type CardAssignmentData = {
    type: "users",
    ids: string[]
} | {
    type: "groups",
    ids: string[]
} | AnyoneOnAssignmentData | {
    type: "looking_for_assignment"
} | null;

export type CardMetadata = {
    [id: string]: {
        /** The value of the metadata field */
        value: string | number | boolean | string[] | number[] | boolean[] | null;
        /** The metadata type is stored on the field to stay valid after schema changes */
        type: CardMetadataFieldType;
    }
};