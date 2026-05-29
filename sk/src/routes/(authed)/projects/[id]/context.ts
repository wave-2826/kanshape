import type { TypedCardPreviewResponse } from "$lib/data/kanban";
import { watch, watchOne, type PageStore } from "$lib/pocketbase";
import { Collections, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
import { createContext } from "svelte";

export function watchProject(id: string) {
    return watchOne(Collections.Projects, id, {
        expand: "subprojects"
    });
}

export function watchBoard(id: string) {
    return watchOne(Collections.Boards, id, {
        expand: "sections"
    });
}

export function watchCards(boardId: string): Promise<PageStore<TypedCardPreviewResponse> | null> {
    return watch(Collections.CardPreview, {
        filter: `board = "${boardId}"`,
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
};
export const [getProjectContext, setProjectContext] = createContext<ProjectContext>();

export type BoardContext = {
    board: Awaited<ReturnType<typeof watchBoard>> | null;
    cards: Awaited<ReturnType<typeof watchCards>> | null;
};
export const [getBoardContext, setBoardContext] = createContext<BoardContext>();

export type SubprojectContext = {
    subproject: SubprojectsRecord | null;
}
export const [getSubprojectContext, setSubprojectContext] = createContext<SubprojectContext>();