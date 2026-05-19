<script lang="ts">
    import { Collections, type CardsResponse, type ProjectsResponse, type SectionsResponse } from "$lib/pocketbase/generated-types";
    import { cannonicalizeExpand as canonicalizeExpand, watch, type ExpandResponse } from "$lib/pocketbase";
    import KanbanCard from "./KanbanCard.svelte";
    import { moveCard, sortCards } from "./kanban";
    import { Funnel, Plus, SquarePlus } from "lucide-svelte";
    import NewCardModal from "./NewCardModal.svelte";

    const {
        project
    }: {
        project: ExpandResponse<ProjectsResponse, "sections">
    } = $props();

    const cards = $derived(await watch(Collections.Cards, {
        filter: `project = "${project.id}"`,
        sort: "position,created"
    }, 1, 500).catch((err) => {
        console.error("Failed to load cards:", err);
        return null;
    }));

    const sections = $derived.by(() => {
        const expandedSections = canonicalizeExpand(project.expand.sections);
        const sectionsById = new Map(expandedSections.map((section) => [section.id, section]));
        const orderedSectionIds = project.sections ?? expandedSections.map((section) => section.id);

        return orderedSectionIds
            .map((sectionId) => sectionsById.get(sectionId))
            .filter((section): section is SectionsResponse => section !== undefined);
    });

    let boardCards = $state<CardsResponse[]>([]);
    let draggedCardId = $state<string | null>(null);
    let hoveredSectionId = $state<string | null>(null);
    let activeDropZone = $state<{ sectionId: string; cardId: string | "last"; } | null>(null);

    function cardsForSection(sectionId: string) {
        return sortCards(boardCards.filter((card) => card.section === sectionId));
    }

    $effect(() => {
        if($cards === null || draggedCardId !== null) return;
        boardCards = sortCards($cards.items);
    });

    let newCardModal: NewCardModal | null = $state(null);

    function onDragStart(card: CardsResponse, event: DragEvent) {
        draggedCardId = card.id;
        event.dataTransfer?.setData("text/plain", card.id);
        if(event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    }

    function onDragEnd() {
        draggedCardId = null;
        hoveredSectionId = null;
        activeDropZone = null;
    }

    function onSectionDragOver(sectionId: string, event: DragEvent) {
        event.preventDefault();
        hoveredSectionId = sectionId;
        updateDropZone(sectionId, event);
    }

    function onSectionDragLeave(sectionId: string) {
        if(hoveredSectionId === sectionId) {
            hoveredSectionId = null;
            activeDropZone = null;
        }
    }

    function updateDropZone(sectionId: string, event: DragEvent) {
        const sectionElem = (event.target as HTMLElement)?.closest("section");
        if(!sectionElem) {
            activeDropZone = null;
            return;
        }

        const firstCard = sectionElem.querySelector("[data-card-id]");
        if(!firstCard || !(firstCard instanceof HTMLElement)) {
            activeDropZone = { sectionId, cardId: "last" };
            return;
        }

        const firstCardRect = firstCard.getBoundingClientRect();
        const midpoint = firstCardRect.top + firstCardRect.height / 2;
        const isBeforeFirstCard = event.clientY < midpoint;

        if(isBeforeFirstCard) {
            activeDropZone = { sectionId, cardId: firstCard.dataset.cardId ?? "last" };
        } else {
            // Find the closest card below the drop point
            const cardsInSection = Array.from(sectionElem.querySelectorAll("[data-card-id]")).filter((elem) => elem instanceof HTMLElement);
            const cardBelow = cardsInSection.find((cardElem) => {
                const rect = cardElem.getBoundingClientRect();
                return event.clientY < rect.top + rect.height / 2;
            });

            if(cardBelow && cardBelow instanceof HTMLElement) {
                activeDropZone = { sectionId, cardId: cardBelow.dataset.cardId ?? "last" };
            } else {
                activeDropZone = { sectionId, cardId: "last" };
            }
        }
    }

    async function onSectionDrop(sectionId: string, event: DragEvent) {
        const dropZone = activeDropZone;
        
        event.preventDefault();
        hoveredSectionId = null;
        activeDropZone = null;

        const cardId = event.dataTransfer?.getData("text/plain") ?? draggedCardId;
        if(!cardId) return;

        const beforeCardId = dropZone?.cardId ?? "first";
        boardCards = await moveCard(boardCards, cardId, sectionId, beforeCardId);
    }
</script>

<div class="kanban">
    <menu>
        <button onclick={() => newCardModal?.open()} disabled={sections.length === 0} class="new">
            <SquarePlus />
            New Card
        </button>
        <button onclick={() => {
            // todo
        }}>
            <Funnel />
            Filter
        </button>
    </menu>

    <NewCardModal bind:this={newCardModal} {sections} {boardCards} projectId={project.id} />

    {#if cards !== null && $cards !== null}
        {#if sections.length > 0}
            <div class="board" class:dragging={draggedCardId !== null}>
                {#each sections as section (section.id)}
                    {@const cards = cardsForSection(section.id)}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <section
                        class:over={hoveredSectionId === section.id}
                        ondragover={(event) => onSectionDragOver(section.id, event)}
                        ondragleave={() => onSectionDragLeave(section.id)}
                        ondrop={(event) => onSectionDrop(section.id, event)}
                    >
                        <div class="section-content">
                            <div class="column-header">
                                <h2 style={`color: ${section.color || 'inherit'};`}>{section.title}</h2>
                                <span>{cards.length}</span>
                                <button onclick={() => newCardModal?.open(section.id)} title="Add new card to this section">
                                    <Plus />
                                </button>
                            </div>

                            <div class="card-list">
                                {#each cards as card, i (card.id)}
                                    <div
                                        class:dragging={draggedCardId === card.id}
                                        class="card-wrapper"
                                        data-card-id={card.id}
                                        draggable="true"
                                        ondragstart={(event) => onDragStart(card, event)}
                                        ondragend={onDragEnd}
                                    >
                                        <div
                                            class:zone-active={activeDropZone?.sectionId === section.id && activeDropZone.cardId === card.id}
                                            class="drop-zone top"
                                            class:topmost={i === 0}
                                        ></div>
                                        <KanbanCard {card} />
                                        {#if i === cards.length - 1}
                                            <div
                                                class:zone-active={activeDropZone?.sectionId === section.id && activeDropZone.cardId === "last"}
                                                class="drop-zone bottom"
                                            ></div>
                                        {/if}
                                    </div>
                                {/each}
                                {#if cards.length === 0}
                                    <p class="empty">Drop a card here to add it</p>
                                {/if}
                            </div>
                        </div>
                    </section>
                {/each}
            </div>
        {:else}
            <p>No sections found for this project.</p>
        {/if}
    {:else}
        <p>Failed to load cards.</p>
    {/if}
</div>

<style lang="scss">
.kanban {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
}
menu {
    background-color: var(--bg-primary);
    padding: 0.25rem;
    border-radius: 4px;
    margin: 0 0.5rem;

    display: flex;
    flex-direction: row;
    gap: 0.5rem;
}
.board {
    flex: 1;

    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    align-items: start;

    padding: 0.5rem 0.5rem 1rem 0.5rem;

    overflow-x: auto;
    overflow-y: hidden;
}

section {
    min-width: 18rem;
    max-width: 25rem;
    flex: 1;

    height: 100%;

    &.over .section-content {
        border: 1px solid var(--border);
    }
    .section-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        transition: border-color 0.1s ease;
        
        padding: 0.25rem 0.5rem 0.5rem 0.5rem;
        border: 1px solid transparent;
        border-radius: 4px;
        background: var(--bg-primary);
    }
}

.column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
        margin: 0;
        flex: 1;
    }
    button {
        --bg-color: transparent;
        padding: 0.25rem;
    }
    // button.secondary {
    //     color: var(--text-secondary);
    // }
    span {
        color: var(--text-secondary);
        font-size: var(--font-small);
        margin-right: 0.5rem;
    }
}

.card-list {
    --list-gap: 0.5rem;

    display: flex;
    flex-direction: column;
    gap: var(--list-gap);
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 0.5rem;
}

.card-wrapper {
    cursor: pointer;
    user-select: none;
    transition: transform 0.1s ease, opacity 0.1s ease, border-color 0.1s ease, background-color 0.1s ease;
    position: relative;

    &:active {
        cursor: grabbing;
    }

    &.dragging {
        opacity: 0.75;
    }

    .drop-zone {
        --shrink: -0.2rem;

        min-height: calc(var(--list-gap) - var(--shrink) * 2);
        border-radius: 4px;
        transition: opacity 0.05s ease;
        background-color: var(--accent);
        opacity: 0;
        pointer-events: none;

        position: absolute;
        left: 0;
        right: 0;

        &.zone-active {
            opacity: 0.1;
        }
        &.top { bottom: calc(100% + var(--shrink)); }
        &.topmost { top: var(--shrink); }
        &.bottom { top: calc(100% + var(--shrink)); min-height: 0.5rem; }
    }
}

.board.dragging .drop-zone {
    pointer-events: all;
}

.empty {
    color: var(--text-tertiary);
    font-size: var(--font-tiny);
    font-style: italic;
    text-align: center;
    padding: 0.25rem 0;
}
</style>

