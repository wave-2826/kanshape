import type { CardsPriorityOptions } from "$lib/pocketbase/generated-types";

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