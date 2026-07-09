<script lang="ts">
    import { type ExpandResponse, type PageStore } from "$lib/pocketbase";
    import { type TypedCardPreviewResponse } from "$lib/data/kanban";
    import type { TypedBoardsResponse } from "$lib/data/project";
    import Gantt, { type GanttCategory, type GanttItem } from "./Gantt.svelte";
    import CardViewPanel from "../kanban/cardView/CardViewPanel.svelte";
    import { getPriorityColor } from "$lib/data/cards";
    import type { CardsPriorityOptions } from "$lib/pocketbase/generated-types";
    import { layoutCardsToGantt } from "./layout";

    const {
        project,
        board,
        cards
    }: {
        project: ExpandResponse<"projects", "subprojects">,
        board: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        cards: PageStore<TypedCardPreviewResponse> | null;
    } = $props();

    const sections = $derived(board.expand.sections ?? []);
    const subprojects = $derived(project.expand.subprojects ?? []);

    let groupBy = $state<"subproject" | "section" | "priority" | "none">("subproject");

    const categories = $derived.by(() => {
        if(cards === null || $cards === null) return [];

        // yes, svelte, we want the whole thing reactive
        $state.snapshot($cards);

        const layout = layoutCardsToGantt($cards.items);

        const items = layout
            .toSorted((a, b) => a.start.getTime() - b.start.getTime())
            .map(({ start, end, card }) => ({
                id: card.id,
                name: card.title,
                start, end,
                due: card.due_by ? new Date(card.due_by) : undefined,
                color: card.priority === "critical" ? "var(--error)" : undefined,
                group: groupBy === "subproject" ? (subprojects.find((sp) => sp.id === card.subprojects?.[0])?.name ?? "No subproject") :
                    groupBy === "section" ? (sections.find((s) => s.id === card.section)?.title ?? "No section") :
                    groupBy === "priority" ? card.priority :
                    ""
            }));
        
        const categoryMap = new Map<string, GanttCategory>();
        for(const item of items) {
            if(!categoryMap.has(item.group)) {
                categoryMap.set(item.group, {
                    name: item.group,
                    items: [],
                    color: groupBy === "priority" ? getPriorityColor(item.group as CardsPriorityOptions) :
                        groupBy === "section" ? sections.find((s) => s.title === item.group)?.color :
                        groupBy === "none" ? "var(--accent)" :
                        undefined
                });
            }
            categoryMap.get(item.group)?.items.push(item);
        }
        return Array.from(categoryMap.values());
    });
    
    let openCardId = $state<string | null>(null);
</script>

<div class="page">
    <CardViewPanel
        {board}
        boardCards={$cards?.items ?? []}
        bind:card={
            () => openCardId ? $cards?.items.find((c) => c.id === openCardId) ?? null : null,
            (v) => openCardId = v?.id ?? null
        }
        onclose={() => openCardId = null}
        {sections} {subprojects}
    />

    <Gantt {categories} onclickitem={(id) => openCardId = id}>
        {#snippet cornerHeader()}
            <select bind:value={groupBy}>
                <option value="subproject">Group by subproject</option>
                <option value="section">Group by section</option>
                <option value="priority">Group by priority</option>
                <option value="none">No grouping</option>
            </select>
        {/snippet}
    </Gantt>
</div>

<style lang="scss">
.page {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
}

select {
    font-size: var(--font-small);
    color: var(--text-secondary);
    padding: 0.25em 0.5em;
}
</style>