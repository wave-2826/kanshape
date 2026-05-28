<script lang="ts">
    import { type ExpandResponse, type PageItemType, type PageStore } from "$lib/pocketbase";
    import CardViewPanel from "./cardView/CardViewPanel.svelte";
    import KanbanMenu from "./KanbanMenu.svelte";
    import KanbanListEntry from "./KanbanListEntry.svelte";
    import Masonry from "../Masonry.svelte";
    import { sortListCards, type TypedCardPreviewResponse } from "$lib/data/kanban";

    const {
        project,
        board,
        cards
    }: {
        project: ExpandResponse<"projects", "subprojects">,
        board: ExpandResponse<"boards", "sections">,
        cards: PageStore<TypedCardPreviewResponse> | null;
    } = $props();

    const sections = $derived.by(() => {
        const expandedSections = board.expand.sections ?? [];
        const sectionsById = new Map(expandedSections.map((section) => [section.id, section]));
        const orderedSectionIds = board.sections ?? expandedSections.map((section) => section.id);

        return orderedSectionIds
            .map((sectionId) => sectionsById.get(sectionId))
            .filter((section) => section !== undefined);
    });
    const subprojects = $derived(project.expand.subprojects ?? []);

    let listCards = $state<PageItemType<typeof cards>[]>([]);
    let openCardId = $state<string | null>(null);

    $effect(() => {
        if($cards === null) return;
        listCards = sortListCards($cards.items, sections);
    });
</script>

<div class="kanban-list">
    <KanbanMenu {project} {board} {sections} cards={listCards} />

    <CardViewPanel
        card={openCardId ? listCards.find((c) => c.id === openCardId) ?? null : null}
        onclose={() => openCardId = null}
        {sections} {subprojects} projectType={project.type}
    />

    {#if cards !== null && $cards !== null}
        <div class="content">
            {#if listCards.length > 0}
                <Masonry gridGap="0.5rem" colWidth="minmax(min(20rem, 100%), 1fr)" items={listCards}>
                    {#each listCards as card (card.id)}
                        <KanbanListEntry {card} {subprojects} {sections} onclick={() => openCardId = card.id} />
                    {/each}
                </Masonry>
            {:else}
                <p class="empty">No cards found</p>
            {/if}
        </div>
    {:else}
        <p>Failed to load cards.</p>
    {/if}
</div>

<style lang="scss">
.kanban-list {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    width: 100%;
    min-height: 0;
    overflow: hidden;
}
.content {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.5rem;
    margin: 0.5rem;

    background-color: var(--bg-primary);
    border-radius: 4px;
}

.empty {
    color: var(--text-tertiary);
    font-size: var(--font-tiny);
    font-style: italic;
    text-align: center;
    padding: 0.5rem 0;
}
</style>