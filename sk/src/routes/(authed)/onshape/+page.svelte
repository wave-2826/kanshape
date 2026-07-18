<script lang="ts">
    import { metadata } from "$lib/metadata";
    import { getOnshapeContext, LinkedProjectType } from "../../../lib/components/nav/onshapeContext.svelte";
    import LinkOnshapeDocument from "./LinkOnshapeDocument.svelte";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { watch } from "$lib/pocketbase";
    import SelectionBanner from "./SelectionBanner.svelte";
    import { Plus } from "lucide-svelte";
    import { deasyncify } from "$lib/util";
    import CardPart from "$lib/components/parts/CardPart.svelte";
    import type { TypedPartsResponse } from "$lib/data/parts";
    import type { Readable } from "svelte/store";
    import type { ListResult } from "pocketbase";
    import KanbanListEntry from "$lib/components/kanban/KanbanListEntry.svelte";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    
    $effect(() => {
        $metadata.title = "Onshape Side Panel";
    });

    const onshapeCtx = getOnshapeContext();
    const selectedIDs = $derived(onshapeCtx.client?.selectedIDs);

    const linkedProject = $derived(onshapeCtx.linkedProject);

    let filterToDocument = $state(false);

    let parts = $derived(deasyncify(watch(Collections.Parts, {
        filter: filterToDocument ? `document_id = "${onshapeCtx.documentId}"` :
            `document_id = "${onshapeCtx.documentId}" && element_id = "${onshapeCtx.elementId}"`
    })) as Readable<ListResult<TypedPartsResponse> | null>);

    let cards = $derived(deasyncify(watch(Collections.PartCards, {
        query: {
            did: onshapeCtx.documentId,
            eid: filterToDocument ? undefined : onshapeCtx.elementId
        }
    }))) as Readable<ListResult<TypedCardPreviewResponse> | null>;
</script>

<div class="page">
    <SelectionBanner selectedIDs={$selectedIDs ?? null} />
    
    <menu>
        <button class="add" onclick={async () => {
        }}>
            <Plus /> New card {$selectedIDs?.length ?? 0 > 0 ? "for selected part" : ""}
        </button>
        
        <div class="multi-button filter-options">
            <button class:selected={!filterToDocument} onclick={() => { filterToDocument = false; }}>
                {onshapeCtx.location === "right-panel-part-studio" ? "Part studio" : "Assembly"}
            </button>
            <button class:selected={filterToDocument} onclick={() => { filterToDocument = true; }}>
                Document
            </button>
        </div>

        <!-- we could add filter/sort settings here but i don't think it's necessary -->
    </menu>

    <div class="cards" data-modal-target>
        {#if $cards}
            {#if $cards.items.length === 0}
                <p class="empty">No cards found.</p>
            {:else}
                {#each $cards.items as card (card.id)}
                    <KanbanListEntry {card} onclick={() => {
                        // todo
                    }} showBoard />
                    {#if $parts}
                        <div class="part-children">
                            {#each $parts.items.filter(
                                p => p.current_card === card.id || p.past_revision_cards.includes(card.id)
                            ) as part (part.id)}
                                <CardPart {part} />
                            {/each}
                        </div>
                    {/if}
                {/each}
            {/if}
        {:else}
            <p class="empty">Loading cards...</p>
        {/if}

        {#if !$parts}
            <p class="empty">Loading parts...</p>
        {/if}
    </div>

    {#if linkedProject === null}
        <p>Loading...</p>
    {:else if linkedProject.type === LinkedProjectType.Unregistered || linkedProject.type === LinkedProjectType.Unlinked}
        <div class="link">
            {#if linkedProject.type === LinkedProjectType.Unlinked}
                <p>This document is registered but not linked to a particular project. Choose one to automatically select card boards.</p>
            {:else}
                <p>This document is not registered. Link it to a project or subproject to create cards.</p>
            {/if}
            <LinkOnshapeDocument />
        </div>
    {/if}
</div>

<style lang="scss">
.page {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;
}
.link {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    overflow-y: auto;
    min-height: 0;
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
    padding: 0 0.5rem;

    button {
        padding: 0.25rem 0.5rem;
    }
}

.cards {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0 0.5rem 0.5rem 0.5rem;

    min-height: 0;
}
.part-children {
    margin-left: 0.5rem;
    padding-left: 0.5rem;
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.25rem;
}
</style>