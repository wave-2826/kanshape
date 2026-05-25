<script>
    import KanbanBoard from "$lib/components/kanban/KanbanBoard.svelte";
    import { getProjectContext } from "./projectContext";

    const ctx = getProjectContext();
    const project = $derived(ctx.project);
    const cards = $derived(ctx.cards);
</script>

{#if $project}
    <KanbanBoard project={$project} cards={cards} />
{/if}