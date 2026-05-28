<script>
    import KanbanList from "$lib/components/kanban/KanbanList.svelte";
    import { getProjectContext, getBoardContext } from "../../../context";

    const project = $derived(getProjectContext().project);
    const board = $derived(getBoardContext().board);
    const cards = $derived(getBoardContext().cards);
</script>

{#if $project && $board}
    <KanbanList project={$project} board={$board} cards={cards} />
{/if}