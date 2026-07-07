<script lang="ts">
    import { type ExpandResponse, type PageStore } from "$lib/pocketbase";
    import { type TypedCardPreviewResponse } from "$lib/data/kanban";
    import type { TypedBoardsResponse } from "$lib/data/project";
    import Gantt, { type GanttCategory, type GanttItem } from "./Gantt.svelte";
    import { addDays } from "$lib/datetime";
    import CardViewPanel from "../kanban/cardView/CardViewPanel.svelte";
    import { getPriorityColor } from "$lib/data/cards";
    import type { CardsPriorityOptions } from "$lib/pocketbase/generated-types";

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

        function fallbackDate(date: string | null, created: string): Date {
            if(date) {
                const d = new Date(date);
                if(!isNaN(d.getTime())) return d;
            }
            const createdDate = new Date(created);
            if(!isNaN(createdDate.getTime())) return createdDate;
            return new Date();
        }

        const items = $cards.items.toSorted((a, b) => a.created.localeCompare(b.created)).map((card) => ({
            id: card.id,
            name: card.title,
            start: new Date(card.created),
            end: fallbackDate(card.due_by, addDays(new Date(card.created), card.duration_days === 0 ? 2 : card.duration_days).toISOString()),
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
        board={board as TypedBoardsResponse}
        card={openCardId ? $cards?.items.find((c) => c.id === openCardId) ?? null : null}
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