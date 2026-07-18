import { page } from "$app/state";
import type { AppConfig } from "$lib/config";
import { nav } from "$lib/navigation";
import { OnshapeClient } from "$lib/onshape/client";
import { watch, type ExpandResponse } from "$lib/pocketbase";
import { Collections } from "$lib/pocketbase/generated-types";
import { createContext, untrack } from "svelte";

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
    wvm?: "w" | "v" | "m";
    wvmId?: string;
    elementId?: string;
    client: OnshapeClient | null;
    location: "right-panel-part-studio" | "right-panel-assembly" | "tab" | null;
    onOnshape: boolean;
};

export const [getOnshapeContext, setOnshapeContext] = createContext<OnshapeContext>();

export function addOnshapeContext(): OnshapeContext {
    let onshapeContext: OnshapeContext = $state({
        linkedProject: null,
        documentId: null,
        wvm: undefined,
        wvmId: undefined,
        elementId: undefined,
        client: null,
        location: null,
        onOnshape: false // set by the parent layout
    });
    setOnshapeContext(onshapeContext);
    return onshapeContext;
}

export function watchOnshapeContext(
    config: AppConfig,
    documentId: string | null,
    wvm: string | null,
    wvmId: string | null,
    elementId: string | null,
    onshapeLocation: string | null,
    onshapeContext: OnshapeContext
) {
    if(!documentId) return;

    onshapeContext.documentId = documentId;
    onshapeContext.location =
        onshapeLocation === "right-panel-part-studio" ? "right-panel-part-studio" :
        onshapeLocation === "right-panel-assembly" ? "right-panel-assembly" :
        onshapeLocation === "tab" ? "tab" : null;
    if(wvm && wvmId && elementId) {
        onshapeContext.wvm = wvm === "v" ? "v" : "w";
        onshapeContext.wvmId = wvmId;
        onshapeContext.elementId = elementId;
    } else {
        onshapeContext.wvm = undefined;
        onshapeContext.wvmId = undefined;
        onshapeContext.elementId = undefined;
    }

    untrack(() => {
        if(onshapeContext.client) {
            onshapeContext.client.dispose();
            onshapeContext.client = null;
        }
        if(onshapeContext.wvm === "w" && wvmId && elementId) onshapeContext.client = new OnshapeClient(
            config,
            documentId,
            wvmId || "",
            elementId || ""
        );
    });

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