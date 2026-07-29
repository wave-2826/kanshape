import type { CardsPriorityOptions, CardsResponse, Create, UsersResponse } from "$lib/pocketbase/generated-types";
import type { TypedCardPreviewResponse } from "./kanban";
import type { CardMetadataFieldType, MetadataValue } from "./project";

export type TypedCardsResponse<Expand = {}> = CardsResponse<CardAssignmentData, CardMetadata, Expand>;
export type TypedCardsCreate = Required<
    Omit<Create<"cards">, "id" | "moved_at">
> & {
    assignment_data: CardAssignmentData,
    metadata: CardMetadata | null
};

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

export function assignedToSelf(card: TypedCardPreviewResponse, auth: UsersResponse | null) {
    const assignment = card.assignment_data as CardAssignmentData;
    if(!assignment) return false;
    // if(assignment.type === "looking_for_assignment") return true;
    if(assignment.type === "anyone_on" && assignment.on_date === new Date().toISOString().split("T")[0]) return true;

    if(!auth) return false;
    if(assignment.type === "users" && assignment.ids.includes(auth.id)) return true;
    if(assignment.type === "groups" && assignment.ids.some(id => auth.groups.includes(id))) return true;
    return false;
}

export type CardMetadata = {
    [id: string]: {
        /** The value of the metadata field */
        value: MetadataValue;
        /** The metadata type is stored on the field to stay valid after schema changes */
        type: CardMetadataFieldType<false>;
    }
};
