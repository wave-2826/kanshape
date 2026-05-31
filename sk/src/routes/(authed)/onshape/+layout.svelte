<script lang="ts">
    import { page } from "$app/state";
    import { deleteRecord, watch } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import type { Snippet } from "svelte";
    import { setOnshapeContext, type OnshapeContext } from "./onshapeContext";
    import { customHeader } from "../+layout.svelte";
    import { ChevronDown, Link, Unlink } from "lucide-svelte";
    import PopoverButton from "$lib/components/PopoverButton.svelte";
    
    const { children }: { children: Snippet } = $props();

    const documentId = page.url.searchParams.get("documentId");
    if(!documentId) {
        console.error("No documentId provided in query params");
    }

    let onshapeContext: OnshapeContext = $state({
        linkedProject: null,
        documentId: documentId ?? ""
    });
    setOnshapeContext(onshapeContext);

    // We use a normal watch instead of watchOne because the project won't always exist
    const linkedProjectItems = documentId ? await watch(Collections.OnshapeDocuments, {
        expand: "project,subproject",
        filter: `id = "${documentId}"`
    }) : null;
    const linkedProject = $derived(linkedProjectItems && $linkedProjectItems ? $linkedProjectItems.items[0] ?? null : null);

    $effect(() => {
        onshapeContext.linkedProject = linkedProject;
    });

    $effect(() => {
        customHeader.set(header);
        return () => {
            customHeader.set(null);
        };
    });
</script>

{#snippet header()}
    {#if linkedProject && documentId}
        <div class="onshape-header">
            <PopoverButton class="linked-project">
                <!-- TODO: we can store this ourselves -->
                <img src="https://www.google.com/s2/favicons?domain=onshape.com&sz=32" alt="Onshape" width="16" height="16" />
                
                {#if !linkedProject.project}
                    <Unlink /> Unlinked
                {:else}
                    <Link /> Linked
                {/if}
    
                <ChevronDown />
    
                {#snippet content()}
                    <div class="popover-content">
                        {#if !linkedProject.project}
                            <p>This document is registered in Kanshape but not linked to any project.</p>
                            <p>Link it to a project or subproject to automatically select one when adding cards.</p>
                        {:else}
                            <p>
                                This document is linked to the project <span class="name">
                                    {linkedProject.expand.project?.title ?? "Unknown Project"}
                                </span> {#if linkedProject.expand.subproject} and subproject <span class="name">
                                    {linkedProject.expand.subproject?.name ?? "Unknown Subproject"}
                                </span>{/if}.
                            </p>
                        {/if}
                        <button onclick={() => {
                            deleteRecord(Collections.OnshapeDocuments, documentId);
                        }} title="Allows you to select a new project or subproject to link">
                            {linkedProject.project ? "Unlink" : "Relink"}
                        </button>
                    </div>
                {/snippet}
            </PopoverButton>
        </div>
    {/if}
{/snippet}

{#if !documentId}
    <p>No documentId provided in query params</p>
{/if}

{@render children()}

<style lang="scss">
.onshape-header {
    display: content;

    img {
        vertical-align: middle;
    }
    :global(svg) {
        width: 1em;
        height: 1em;
        color: var(--text-secondary);
    }
    
    :global(.linked-project) {
        font-size: var(--font-small);

        display: flex;
        align-items: center;
        gap: 0.25rem;

        --bg-color: var(--bg-secondary);
        padding: 0.25em 0.5em;
        border-radius: 4px;
    }

    .name {
        color: var(--accent);
    }

    .popover-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 200px;
    }
}
</style>