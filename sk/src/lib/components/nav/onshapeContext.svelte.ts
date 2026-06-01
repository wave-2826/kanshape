import { page } from "$app/state";
import { nav } from "$lib/navigation";
import { watch, type ExpandResponse } from "$lib/pocketbase";
import { Collections } from "$lib/pocketbase/generated-types";
import { createContext } from "svelte";
import { get } from "svelte/store";

export enum LinkedProjectType {
    /** This document is linked to a project */
    Project = "project",
    /** This document is linked to a subproject */
    Subproject = "subproject",
    /** This document is registered, but intentionally not linked to any project */
    Unlinked = "unlinked",
    /** This document is not registered at all */
    Unregistered = "unregistered"
}

export type OnshapeContext = {
    linkedProject: {
        type: LinkedProjectType.Project | LinkedProjectType.Subproject | LinkedProjectType.Unlinked;
    } & ExpandResponse<"onshape_documents", "project,subproject"> | {
        type: LinkedProjectType.Unregistered;
    } | null;
    documentId: string | null;
};

export const [getOnshapeContext, setOnshapeContext] = createContext<OnshapeContext>();

export function addOnshapeContext(): OnshapeContext {
    let onshapeContext: OnshapeContext = $state({
        linkedProject: null,
        documentId: null
    });
    setOnshapeContext(onshapeContext);
    return onshapeContext;
}

export function watchOnshapeContext(documentId: string | null, onshapeContext: OnshapeContext) {
    if(!documentId) return;

    onshapeContext.documentId = documentId;

    let unsub: (() => void) | undefined;

    // We use a normal watch instead of watchOne because the project won't always exist
    if(documentId) {
        watch(Collections.OnshapeDocuments, {
            expand: "project,subproject",
            filter: `id = "${documentId}"`
        }).then((res) => {
            unsub = res.subscribe((res) => {
                const link = res.items[0];
                if(!link) {
                    onshapeContext.linkedProject = { type: LinkedProjectType.Unregistered };
                    // hack
                    if(page.route.id !== "/(authed)/onshape") {
                        nav("/onshape/document");
                    }
                } else {
                    let type = LinkedProjectType.Unlinked;
                    if(link.project) type = LinkedProjectType.Project;
                    if(link.subproject) type = LinkedProjectType.Subproject;
                    onshapeContext.linkedProject = {
                        ...link,
                        type
                    };
                }
            });
        });
    }

    return () => unsub?.();
}