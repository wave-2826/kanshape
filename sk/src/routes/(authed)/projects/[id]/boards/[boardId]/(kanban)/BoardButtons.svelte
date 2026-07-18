<script lang="ts">
    import { page } from "$app/state";
    import { link } from "$lib/actions";
    import { ChartNoAxesGantt, Kanban, List } from "lucide-svelte";

    const {
        projectId,
        boardId,
        buttonClass = ""
    }: {
        projectId: string,
        boardId: string,
        buttonClass?: string
    } = $props();
</script>

<button use:link={`/projects/${projectId}/boards/${boardId}/gantt`} class:active={page.route.id?.endsWith("/gantt")} class={buttonClass}>
    <ChartNoAxesGantt />
    Gantt
</button>
<button use:link={`/projects/${projectId}/boards/${boardId}/list`} class:active={page.route.id?.endsWith("/list")} class={buttonClass}>
    <List />
    List
</button>
<button use:link={`/projects/${projectId}/boards/${boardId}`} class:active={page.route.id?.endsWith("/(kanban)")} class={buttonClass}>
    <Kanban />
    Board
</button>

