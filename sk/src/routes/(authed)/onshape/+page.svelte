<script lang="ts">
    import { getConfig } from "$lib/config";
    import { metadata } from "$lib/metadata";
    import { OnshapeClient } from "$lib/onshape/client";
    import { page } from "$app/state";
    import { getOnshapeContext, LinkedProjectType } from "../../../lib/components/nav/onshapeContext.svelte";
    import LinkOnshapeDocument from "./LinkOnshapeDocument.svelte";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { save } from "$lib/pocketbase";
    import SelectionBanner from "./SelectionBanner.svelte";
    
    $effect(() => {
        $metadata.title = "Onshape Side Panel";
    });

    const onshapeCtx = getOnshapeContext();
    const selectedIDs = $derived(onshapeCtx.client?.selectedIDs);

    const linkedProject = $derived(onshapeCtx.linkedProject);
</script>

<div class="page">
    <SelectionBanner selectedIDs={$selectedIDs ?? null} />
    
    <div class="content">
        {#if linkedProject === null}
            <p>Loading...</p>
        {:else if linkedProject.type === LinkedProjectType.Unregistered || linkedProject.type === LinkedProjectType.Unlinked}
            {#if linkedProject.type === LinkedProjectType.Unlinked}
                <p>This document is registered but not linked to a particular Onshape document. Link it to use the document tab.</p>
            {/if}
            <LinkOnshapeDocument />
            <button onclick={() => {
                save(Collections.OnshapeDocuments, {
                    id: onshapeCtx.documentId ?? "",
                    workspace_id: onshapeCtx.wvmId ?? ""
                }, { create: true });
            }}>Continue with no linked project</button>
        {:else}
            <!-- <p>
                Linked to project "{linkedProject.expand.project?.title ?? "Unknown Project"}"
                {#if linkedProject.expand.subproject} and subproject "{linkedProject.expand.subproject?.name ?? "Unknown Subproject"}"{/if}
                .
            </p> -->
            <button class="add" onclick={async () => {
            }}>
                Add card {$selectedIDs?.length ?? 0 > 0 ? "for selected part" : ""}
            </button>
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
</style>