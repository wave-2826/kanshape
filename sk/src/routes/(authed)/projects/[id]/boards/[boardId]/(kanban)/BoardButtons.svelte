<script lang="ts">
    import { page } from "$app/state";
    import { ChartNoAxesGantt, Kanban, List } from "@lucide/svelte";

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

<a class={["button", buttonClass]} href={`/projects/${projectId}/boards/${boardId}/gantt`} class:active={page.route.id?.endsWith("/gantt")}>
    <ChartNoAxesGantt />
    Gantt
</a>
<a class={["button", buttonClass]} href={`/projects/${projectId}/boards/${boardId}/list`} class:active={page.route.id?.endsWith("/list")}>
    <List />
    List
</a>
<a class={["button", buttonClass]} href={`/projects/${projectId}/boards/${boardId}`} class:active={page.route.id?.endsWith("/(kanban)")}>
    <Kanban />
    Board
</a>

