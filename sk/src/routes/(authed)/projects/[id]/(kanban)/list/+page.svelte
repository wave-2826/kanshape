<script>
    import KanbanList from "$lib/components/kanban/KanbanList.svelte";
    import { getProjectContext } from "../projectContext";

    const ctx = getProjectContext();
    const project = $derived(ctx.project);
    const cards = $derived(ctx.cards);
</script>

{#if $project}
    <KanbanList project={$project} cards={cards} />
{/if}