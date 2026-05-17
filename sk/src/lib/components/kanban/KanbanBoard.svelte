<script lang="ts">
    import { Collections, type CardsResponse, type ProjectsResponse, type SectionsResponse } from "$lib/pocketbase/generated-types";
    import { cannonicalizeExpand, save, watch, type ExpandResponse } from "$lib/pocketbase";
    import KanbanCard from "./KanbanCard.svelte";
    import { positionBetween, sortCards } from "./kanban";

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

    $inspect(cards);

    const sections = $derived.by(() => {
        const expandedSections = cannonicalizeExpand(project.expand.sections);
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
    let drafts = $state<Record<string, string>>({});

    function cardsForSection(sectionId: string) {
        return sortCards(boardCards.filter((card) => card.section === sectionId));
    }

    function nextCardPosition(sectionId: string) {
        const positions = boardCards
            .filter((card) => card.section === sectionId)
            .map((card) => card.position ?? 0);
        return (positions.length > 0 ? Math.max(...positions) : 0) + 1000;
    }

    $effect(() => {
        if($cards === null || draggedCardId !== null) return;
        boardCards = sortCards($cards.items);
    });

    async function createCard(sectionId: string) {
        const title = (drafts[sectionId] ?? "").trim();
        if(title.length === 0) return;

        const savedCard = await save(Collections.Cards, {
            title,
            project: project.id,
            section: sectionId,
            position: nextCardPosition(sectionId),
            moved_at: new Date().toISOString()
        }, { create: true }).catch((err) => {
            console.error("Failed to create card:", err);
            return null;
        });

        if(!savedCard) return;

        drafts[sectionId] = "";
        boardCards = sortCards([...boardCards.filter((card) => card.id !== savedCard.id), savedCard]);
    }

    async function moveCard(cardId: string, sectionId: string, beforeCardId: string | "last" | "first" | null = "first") {
        const card = boardCards.find((entry) => entry.id === cardId);
        if(!card) return;

        const sectionCards = sortCards(boardCards.filter((entry) => entry.section === sectionId && entry.id !== cardId));

        if(beforeCardId === "last") beforeCardId = null;
        if(beforeCardId === "first") beforeCardId = sectionCards[0]?.id ?? null;
        const targetIndex = beforeCardId ? sectionCards.findIndex((entry) => entry.id === beforeCardId) : -1;
        const targetPosition = targetIndex >= 0
            ? positionBetween(sectionCards[targetIndex - 1]?.position, sectionCards[targetIndex]?.position)
            : nextCardPosition(sectionId);

        if(card.section === sectionId && beforeCardId === card.id) return;

        const savedCard = await save(Collections.Cards, {
            id: card.id,
            section: sectionId,
            position: targetPosition,
            moved_at: new Date().toISOString()
        }).catch((err) => {
            console.error("Failed to move card:", err);
            return null;
        });

        if(!savedCard) return;

        boardCards = sortCards([...boardCards.filter((entry) => entry.id !== savedCard.id), savedCard]);
    }

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

        const firstCard = sectionElem.querySelector(".card");
        if(!firstCard || !(firstCard instanceof HTMLElement)) {
            activeDropZone = { sectionId, cardId: "last" };
            return;
        }

        const firstCardRect = firstCard.getBoundingClientRect();
        const midpoint = firstCardRect.top + firstCardRect.height / 2;
        const isBeforeFirstCard = event.clientY < midpoint;

        if(isBeforeFirstCard) {
            activeDropZone = { sectionId, cardId: firstCard.dataset.id ?? "last" };
        } else {
            // Find the closest card below the drop point
            const cardsInSection = Array.from(sectionElem.querySelectorAll(".card")).filter((elem) => elem instanceof HTMLElement);
            const cardBelow = cardsInSection.find((cardElem) => {
                const rect = cardElem.getBoundingClientRect();
                return event.clientY < rect.top + rect.height / 2;
            });

            if(cardBelow && cardBelow instanceof HTMLElement) {
                activeDropZone = { sectionId, cardId: cardBelow.dataset.id ?? "last" };
            } else {
                activeDropZone = { sectionId, cardId: "last" };
            }
        }
    }

    function onSectionDrop(sectionId: string, event: DragEvent) {
        const dropZone = activeDropZone;
        
        event.preventDefault();
        hoveredSectionId = null;
        activeDropZone = null;

        const cardId = event.dataTransfer?.getData("text/plain") ?? draggedCardId;
        if(!cardId) return;

        const beforeCardId = dropZone?.cardId ?? "first";
        moveCard(cardId, sectionId, beforeCardId);
    }
</script>

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
                    <div class="column-header">
                        <h2 style={`color: ${section.color || 'inherit'};`}>{section.title}</h2>
                        <span>{cards.length}</span>
                    </div>

                    <div class="card-list">
                        {#each cards as card, i (card.id)}
                            <div
                                class:dragging={draggedCardId === card.id}
                                class="card"
                                data-id={card.id}
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
                            <p class="empty">No cards.</p>
                        {/if}
                    </div>

                    <!-- very very temporary -->
                    <form class="new-card" onsubmit={(event) => {
                        event.preventDefault();
                        createCard(section.id);
                    }}>
                        <input
                            type="text"
                            placeholder="New card"
                            value={drafts[section.id] ?? ""}
                            oninput={(event) => drafts[section.id] = event.currentTarget.value}
                        />
                        <button type="submit" disabled={(drafts[section.id] ?? "").trim().length === 0}>
                            Add card
                        </button>
                    </form>
                </section>
            {/each}
        </div>
    {:else}
        <p>No sections found for this project.</p>
    {/if}
{:else}
    <p>Failed to load cards.</p>
{/if}

<style lang="scss">
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
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem;
    border: 1px solid transparent;
    border-radius: 4px;
    background: var(--bg-primary);
    transition: border-color 0.1s ease;

    min-width: 18rem;
    max-width: 25rem;
    flex: 1;

    max-height: 100%;

    &.over {
        border: 1px solid var(--border);
    }
}

.column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
        margin: 0;
    }
    span {
        color: var(--text-secondary);
        font-size: var(--font-small);
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

.card {
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    background: var(--bg-secondary);
    cursor: grab;
    user-select: none;
    transition: transform 0.1s ease, opacity 0.1s ease, border-color 0.1s ease, background-color 0.1s ease;
    position: relative;

    &:active {
        cursor: grabbing;
    }

    &.dragging {
        opacity: 0.75;
        border-color: var(--accent);
        background: var(--bg-selection);
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
    color: var(--text-secondary);
    font-size: var(--font-small);
    padding: 0.25rem 0;
}

.new-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>

