<script lang="ts">
    import { getConfig } from "$lib/config";
    import { metadata } from "$lib/metadata";
    import { OnshapeClient } from "$lib/onshape/client";
    import { page } from "$app/state";
    import { getOnshapeContext, LinkedProjectType } from "../../../lib/components/nav/onshapeContext.svelte";
    import LinkOnshapeDocument from "./LinkOnshapeDocument.svelte";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { save } from "$lib/pocketbase";
    import { evalFeatureScript } from "$lib/onshape/featureScript";
    import { getPartHeuristics } from "$lib/onshape/partHeuristics";
    
    $effect(() => {
        $metadata.title = "Onshape Side Panel";
    });

    const config = getConfig();
    let onshape = $state<OnshapeClient | null>(null);
    const selectedIDs = $derived(onshape?.selectedIDs);
    $effect(() => {
        onshape = new OnshapeClient(
            config,
            page.url.searchParams.get("documentId") || "",
            page.url.searchParams.get("workspaceId") || page.url.searchParams.get("versionId") || "",
            page.url.searchParams.get("elementId") || ""
        );
        return () => {
            onshape?.dispose();
        };
    });

    const onshapeCtx = getOnshapeContext();
    const linkedProject = $derived(onshapeCtx.linkedProject);
</script>

<div class="page">
    <header>
        {#if $selectedIDs && $selectedIDs.length > 0}
            <p>
                Part selected.
                <span class="ids">entities {$selectedIDs.join(", ")}</span>
            </p>
            <button onclick={async () => {
                if(onshapeCtx.documentId && onshapeCtx.wvm && onshapeCtx.wvmId && onshapeCtx.partStudioId)
                    console.log(await getPartHeuristics(onshapeCtx.documentId, onshapeCtx.wvm, onshapeCtx.wvmId, onshapeCtx.partStudioId, $selectedIDs[0]));
            }}>Create card</button>
        {:else}
            <p>No selected parts. Select something to create a card.</p>
        {/if}
    </header>
    
    <div class="content">
        {#if linkedProject === null}
            <p>Loading...</p>
        {:else if linkedProject.type === LinkedProjectType.Unregistered}
            <LinkOnshapeDocument />
            <button onclick={() => {
                save(Collections.OnshapeDocuments, { id: onshapeCtx.documentId ?? "" }, { create: true });
            }}>Continue with no linked project</button>
        {:else}
            {#if linkedProject.type === LinkedProjectType.Unlinked}
                <p>Linked to no project</p>
            {:else}
                <p>Linked to project: {linkedProject.expand.project?.title ?? "Unknown Project"}{#if linkedProject.expand.subproject} and subproject {linkedProject.expand.subproject?.name ?? "Unknown Subproject"}{/if}.</p>
            {/if}
        {/if}
    </div>
</div>

<style lang="scss">
.page {
    display: grid;
    grid-template-rows: auto 1fr;
}
.content {
    padding: 1rem;
}

header {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border);

    p {
        display: flex;
        flex-direction: column;
        color: var(--accent);
    }
    .ids {
        font-family: monospace;
        font-size: var(--font-tiny);
        color: var(--text-secondary);
    }
}
</style>