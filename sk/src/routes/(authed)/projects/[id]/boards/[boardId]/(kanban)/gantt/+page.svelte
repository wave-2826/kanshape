<script>
    import GanttChart from "$lib/components/gantt/GanttChart.svelte";
    import { getProjectContext, getBoardContext } from "../../../../context";

    const project = $derived(getProjectContext().project);
    const board = $derived(getBoardContext().board);
    const cards = $derived(getBoardContext().cards);
</script>

{#if $project && $board}
    <GanttChart project={$project} board={$board} cards={cards} />
{/if}