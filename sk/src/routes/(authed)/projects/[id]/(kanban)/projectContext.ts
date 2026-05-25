import type { TypedCardPreviewResponse } from "$lib/components/kanban/kanban";
import { watch, watchOne, type PageStore } from "$lib/pocketbase";
import { Collections } from "$lib/pocketbase/generated-types";
import { createContext } from "svelte";

export function watchProject(id: string) {
    return watchOne(Collections.Projects, id, {
        expand: "subprojects,sections"
    });
}

export function watchCards(projectId: string): Promise<PageStore<TypedCardPreviewResponse> | null> {
    return watch(Collections.CardPreview, {
        filter: `project = "${projectId}"`,
        sort: "position,created"
    }, 1, 500, {
        waitForConnection: true,
        pollOnChange: [Collections.Cards]
    }).catch((err) => {
        console.error("Failed to load cards:", err);
        return null;
    }) as Promise<PageStore<TypedCardPreviewResponse> | null>;
}

export type ProjectContext = {
    project: Awaited<ReturnType<typeof watchProject>> | null;
    cards: Awaited<ReturnType<typeof watchCards>> | null;
};
export const [getProjectContext, setProjectContext] = createContext<ProjectContext>();