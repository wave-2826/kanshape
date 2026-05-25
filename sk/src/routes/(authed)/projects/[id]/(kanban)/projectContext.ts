import { watchOne } from "$lib/pocketbase";
import { Collections } from "$lib/pocketbase/generated-types";
import { createContext } from "svelte";

export function watchProject(id: string) {
    return watchOne(Collections.Projects, id, {
        expand: "subprojects,sections"
    });
}

export type ProjectContext = {
    project: Awaited<ReturnType<typeof watchProject>> | null;
};
export const [getProjectContext, setProjectContext] = createContext<ProjectContext>();