<script lang="ts">
    import { Collections, type CardsResponse, type ProjectsResponse, type SectionsResponse } from "$lib/pocketbase/generated-types";
    import { cannonicalizeExpand, save, watch, type ExpandResponse } from "$lib/pocketbase";

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
    let drafts = $state<Record<string, string>>({});

    function sortCards(list: CardsResponse[]) {
        return [...list].sort((left, right) => {
            const positionDelta = (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER);
            if(positionDelta !== 0) return positionDelta;
            return left.created.localeCompare(right.created);
        });
    }

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
        }).catch((err) => {
            console.error("Failed to create card:", err);
            return null;
        });

        if(!savedCard) return;

        drafts[sectionId] = "";
        boardCards = sortCards([...boardCards.filter((card) => card.id !== savedCard.id), savedCard]);
    }

    async function moveCard(cardId: string, sectionId: string) {
        const card = boardCards.find((entry) => entry.id === cardId);
        if(!card || card.section === sectionId) return;

        const savedCard = await save(Collections.Cards, {
            id: card.id,
            section: sectionId,
            position: nextCardPosition(sectionId),
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
    }

    function onSectionDragOver(sectionId: string, event: DragEvent) {
        event.preventDefault();
        hoveredSectionId = sectionId;
    }

    function onSectionDragLeave(sectionId: string) {
        if(hoveredSectionId === sectionId) hoveredSectionId = null;
    }

    function onSectionDrop(sectionId: string, event: DragEvent) {
        event.preventDefault();
        hoveredSectionId = null;

        const cardId = event.dataTransfer?.getData("text/plain") ?? draggedCardId;
        if(cardId) void moveCard(cardId, sectionId);
    }
</script>

{#if cards !== null && $cards !== null}
    {#if sections.length > 0}
        <div class="board">
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
                        {#each cards as card (card.id)}
                            <div
                                class:dragging={draggedCardId === card.id}
                                class="card"
                                draggable="true"
                                ondragstart={(event) => onDragStart(card, event)}
                                ondragend={onDragEnd}
                            >
                                {card.title}
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

    padding: 0.5rem;

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
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    overflow-y: auto;
}

.card {
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    background: var(--bg-secondary);
    cursor: grab;
    user-select: none;
    transition: transform 0.1s ease, opacity 0.1s ease, border-color 0.1s ease, background-color 0.1s ease;

    &:active {
        cursor: grabbing;
    }

    &.dragging {
        opacity: 0.75;
        border-color: var(--accent);
        background: var(--bg-selection);
    }
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

