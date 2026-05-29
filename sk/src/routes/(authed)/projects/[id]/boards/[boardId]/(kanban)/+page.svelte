<script>
    import KanbanBoard from "$lib/components/kanban/KanbanBoard.svelte";
    import { getBoardContext, getProjectContext } from "../../../context";

    const project = $derived(getProjectContext().project);
    const board = $derived(getBoardContext().board);
    const cards = $derived(getBoardContext().cards);
</script>

{#if $project && $board}
    <KanbanBoard project={$project} board={$board} cards={cards} />
{/if}