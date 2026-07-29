<script lang="ts">
    import { metadata } from "$lib/metadata";
    import { getOnshapeContext, LinkedProjectType } from "../../../lib/components/nav/onshapeContext.svelte";
    import LinkOnshapeDocument from "./LinkOnshapeDocument.svelte";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { save, watch, watchOne, type ExpandResponse } from "$lib/pocketbase";
    import SelectionBanner from "./SelectionBanner.svelte";
    import { Plus } from "lucide-svelte";
    import { deasyncify, deepEqual } from "$lib/util";
    import CardPart from "$lib/components/parts/CardPart.svelte";
    import KanbanListEntry from "$lib/components/kanban/KanbanListEntry.svelte";
    import { nav } from "$lib/navigation";
    import { derived } from "svelte/store";
    import CardViewPanel from "$lib/components/kanban/cardView/CardViewPanel.svelte";
    import { untrack } from "svelte";
    import { createOpenCardState } from "$lib/components/kanban/cardView/state.svelte";
    
    $effect(() => {
        $metadata.title = "Onshape Side Panel";
    });

    const onshapeCtx = getOnshapeContext();
    const selections = $derived(onshapeCtx.client ? derived(onshapeCtx.client.selections, (selections) =>
        selections.filter(s => ["BODY", "ENTITY", "OCCURRENCE"].includes(s.selectionType))
    ) : null);

    const linkedProject = $derived(onshapeCtx.linkedProject);

    let filterToDocument = $state(false);

    let parts = $derived(deasyncify(watch(Collections.Parts, {
        filter: filterToDocument ? `document_id = "${onshapeCtx.documentId}"` :
            `document_id = "${onshapeCtx.documentId}" && element_id = "${onshapeCtx.elementId}"`
    })));

    let cards = $derived(deasyncify(watch(Collections.PartCards, {
        query: {
            did: onshapeCtx.documentId,
            eid: filterToDocument ? undefined : onshapeCtx.elementId
        }
    }, 0, 500, {
        pollOnChange: [Collections.Cards]
    })));

    // to whoever reads this code: i'm deeply, truly remorseful for this heinous mess i'm unfortunate enough
    // to appear in the blame of, and am gravely reconsidering the choices which have led me here. godspeed.

    // TODO: deduplicate this logic from subproject rendering
    // perhaps another "unidentified card" (??) component?
    let openCardId = createOpenCardState();
    let openCard = $state<ExpandResponse<"part_cards", ""> | null>(null);
    $effect.pre(() => {
        if(!openCardId.cardId || !cards || !$cards) {
            openCard = null;
            return;
        }
        const cardItem = $cards?.items.find((c) => c.id === openCardId.cardId);
        if(cardItem && untrack(() => cardItem.id !== openCard?.id)) {
            openCard = cardItem;
        }
    });

    // This is kind of a mess, but we need information from the open card's board and project, which depends
    // on the open card, so we need to do a bunch of fetching to gather that information. It's not
    // the worst, at least.
    const openCardProject = $derived(openCard ? deasyncify(watchOne(Collections.Projects, openCard.project, {
        expand: "subprojects"
    })) : null);
    const openCardBoard = $derived(openCard ? deasyncify(watchOne(Collections.Boards, openCard.board, {
        expand: "sections"
    })) : null);
    // It would be ideal to fetch only the open card's dependencies here, but that would benefit from
    // a separate cached card loading system or something
    // TODO: Don't fetch all board cards
    const openCardBoardCards = $derived(openCardBoard ? deasyncify(watch(Collections.CardPreview, {
        filter: `board = "${$openCardBoard?.id}"`,
        sort: "position,created"
    }, 1, 500, {
        waitForConnection: true,
        pollOnChange: [Collections.Cards]
    })) : null);
</script>

<div class="page" data-modal-target>
    <CardViewPanel
        board={$openCardBoard ?? undefined}
        boardCards={$openCardBoardCards?.items}
        bind:card={
            () => $openCardBoard && $openCardBoardCards ? openCardId.cardId : null,
            (id) => {
                if(id && !$cards?.items.find((c) => c.id === id)) {
                    if(!$openCardBoardCards || !$openCardProject) return;
                    
                    // this card is from another subproject; open its board in a new tab
                    const v = $openCardBoardCards.items.find(c => c.id === id);
                    if(!v) {
                        console.warn(`Card ${id} not found in board ${$openCardBoard?.id}`);
                    } else {
                        window.open(`/projects/${$openCardProject.id}/boards/${v?.board}?card=${id}`, "_blank");
                    }
                    return;
                }
                openCardId.cardId = id;
            }
        }
        subprojects={$openCardProject?.expand.subprojects ?? []}
        projectId={$openCardProject?.id ?? ""}
    />
    
    <SelectionBanner selections={$selections ?? []} />
    
    <menu>
        <button class="add" onclick={() => {
            if($selections && $selections.length > 0) {
                nav(`/onshape/new?selection=${encodeURIComponent(JSON.stringify($selections[0]))}`)
            // We could automatically add the assembly if in an assembly, but we have a separate
            // assembly button 
            // } else if(onshapeCtx.location === "right-panel-assembly") {
            //     nav(`/onshape/new?selection=assembly`);
            } else {
                nav(`/onshape/new`);
            }
        }}>
            <Plus /> New card
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
                        openCardId.cardId = card.id;
                    }} showBoard />
                    {#if $parts}
                        <div class="part-children">
                            {#each $parts.items.filter(
                                p => p.current_card === card.id || p.past_revision_cards.includes(card.id)
                            ) as part (part.id)}
                                <CardPart bind:part={() => part, p => {
                                    $parts.items = $parts.items.map(existing => existing.id === p.id ? p : existing);
                                    save(Collections.Parts, { ...p, preview_model: undefined });
                                }} />
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

        {#if linkedProject === null}
            <p>Loading...</p>
        {:else if linkedProject.type === LinkedProjectType.Unregistered || linkedProject.type === LinkedProjectType.Unlinked}
            <div class="link">
                {#if linkedProject.type === LinkedProjectType.Unlinked}
                    <p>This document is registered but not linked to a particular project. Choose one to automatically select card boards.</p>
                {:else}
                    <p>This document is not registered. cChoose one to automatically select card boards.</p>
                {/if}
                <LinkOnshapeDocument />
            </div>
        {/if}
    </div>
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
    padding: 0.5rem 1rem 1rem 1rem;
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
    overflow-x: hidden;
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