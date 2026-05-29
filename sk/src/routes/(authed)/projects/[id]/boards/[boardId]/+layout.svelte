<script lang="ts">
    import { page } from "$app/state";
    import { Kanban, List } from "lucide-svelte";
    import type { Snippet } from "svelte";
    import { getProjectContext, setBoardContext, watchBoard, watchCards, type BoardContext } from "../../context";
    import type { ProjectLinkedSite } from "$lib/data/project";
    import { link } from "$lib/actions";
    import ProjectPage from "../../ProjectPage.svelte";

    const {
        children
    }: {
        children: Snippet
    } = $props();

    const boardId = $derived(page.params.boardId);

    let boardContext = $state<BoardContext>({ board: null, cards: null });
    setBoardContext(boardContext);

    const board = $derived(boardId ? await watchBoard(boardId).catch((err) => {
        console.error("Failed to load board:", err);
        return null;
    }) : null);

    const cards = $derived($board ? await watchCards($board.id).catch((err) => {
        console.error("Failed to load cards:", err);
        return null;
    }) : null);

    $effect(() => {
        boardContext.board = board;
        boardContext.cards = cards;
    });

    const project = $derived(getProjectContext().project);
</script>

{#if project && $project !== null && board && $board !== null}
    <ProjectPage
        project={$project}
        subtitle={$board.title}
        linkedSites={$board.linked_sites as ProjectLinkedSite[]}
    >
        {#snippet navItems()}
            <div class="multi-button">
                <button use:link={`/projects/${$project.id}/boards/${$board.id}/list`} class:active={page.route.id?.endsWith("/list")}>
                    <List />
                    List
                </button>
                <button use:link={`/projects/${$project.id}/boards/${$board.id}`} class:active={!page.route.id?.endsWith("/list")}>
                    <Kanban />
                    Board
                </button>
            </div>
        {/snippet}
        {@render children()}
    </ProjectPage>
{:else}
    <p>Loading...</p>
{/if}