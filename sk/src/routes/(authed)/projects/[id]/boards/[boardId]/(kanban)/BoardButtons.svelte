<script lang="ts">
    import { page } from "$app/state";
    import { link } from "$lib/actions";
    import { ChartNoAxesGantt, Kanban, List } from "lucide-svelte";

    const {
        projectId,
        boardId
    }: {
        projectId: string,
        boardId: string
    } = $props();
</script>

<button use:link={`/projects/${projectId}/boards/${boardId}/gantt`} class:active={page.route.id?.endsWith("/gantt")}>
    <ChartNoAxesGantt />
    Gantt
</button>
<button use:link={`/projects/${projectId}/boards/${boardId}/list`} class:active={page.route.id?.endsWith("/list")}>
    <List />
    List
</button>
<button use:link={`/projects/${projectId}/boards/${boardId}`} class:active={page.route.id?.endsWith("/(kanban)")}>
    <Kanban />
    Board
</button>

