<script lang="ts">
    import { type ExpandResponse, type PageStore } from "$lib/pocketbase";
    import { type TypedCardPreviewResponse } from "$lib/data/kanban";
    import type { TypedBoardsResponse } from "$lib/data/project";
    import Gantt from "./Gantt.svelte";
    import { addDays } from "$lib/datetime";
    import CardViewPanel from "../kanban/cardView/CardViewPanel.svelte";

    const {
        project,
        board,
        cards
    }: {
        project: ExpandResponse<"projects", "subprojects">,
        board: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        cards: PageStore<TypedCardPreviewResponse> | null;
    } = $props();

    const items = $derived.by(() => {
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

        const events = $cards.items.toSorted((a, b) => a.created.localeCompare(b.created)).map((card) => ({
            id: card.id,
            name: card.title,
            start: new Date(card.created),
            end: fallbackDate(card.due_by, addDays(new Date(card.created), card.duration_days === 0 ? 2 : card.duration_days).toISOString()),
            color: card.priority === "critical" ? "var(--error)" : undefined
        }));
        return events;
    });

    const sections = $derived(board.expand.sections ?? []);
    const subprojects = $derived(project.expand.subprojects ?? []);
    
    let openCardId = $state<string | null>(null);
</script>

<div class="page">
    <CardViewPanel
        board={board as TypedBoardsResponse}
        card={openCardId ? $cards?.items.find((c) => c.id === openCardId) ?? null : null}
        onclose={() => openCardId = null}
        {sections} {subprojects}
    />

    <Gantt {items} onclickitem={(id) => openCardId = id} />
</div>

<style lang="scss">
.page {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
}
</style>