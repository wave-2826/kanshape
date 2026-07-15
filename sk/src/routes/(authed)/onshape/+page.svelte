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
    import { Plus } from "lucide-svelte";
    
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
            <!-- <select>
                <option>Cards in this {onshapeCtx.location === "right-panel-part-studio" ? "part studio" : "assembly"}</option>
                <option>Cards in this document</option>
            </select> -->

            <menu>
                <button class="add" onclick={async () => {
                }}>
                    <Plus /> New card {$selectedIDs?.length ?? 0 > 0 ? "for selected part" : ""}
                </button>
                
                <div class="multi-button filter-options">
                    <button class="selected">{onshapeCtx.location === "right-panel-part-studio" ? "Part studio" : "Assembly"}</button>
                    <button>Document</button>
                </div>

                <!-- we could add filter/sort settings here but i don't think it's necessary -->
            </menu>

            <div class="cards">
                <p class="empty">No cards found.</p>
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
.page {
    display: grid;
    grid-template-rows: auto 1fr;
}
.content {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.empty {
    font-size: var(--font-small);
    color: var(--text-tertiary);
    font-style: italic;
    margin: 0.5rem;
}

menu {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0;
    margin: 0;

    button {
        padding: 0.25rem 0.5rem;
    }
}

.cards {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>