<script lang="ts">
    import { page } from "$app/state";
    import { Kanban, List } from "lucide-svelte";
    import type { Snippet } from "svelte";
    import { getProjectContext, setBoardContext, watchBoard, watchCards, type BoardContext } from "../../context";
    import SiteLinks from "./SiteLinks.svelte";
    import type { ProjectLinkedSite } from "$lib/data/project";
    import OnshapeLinks from "./OnshapeLinks.svelte";
    import { getIsMobile } from "../../../../+layout.svelte";
    import { link } from "$lib/actions";

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

    const onOnshape = $derived((page.route.id?.startsWith("/(authed)/(onshape)") || page.url.searchParams.get("onshape") === "true") ?? false);

    const project = $derived(getProjectContext().project);
</script>

<div class="page">
    {#if project && $project !== null && board && $board !== null}
        <svelte:boundary>
            {#snippet failed(error)}
                {@debug error}
                <p>Failed to load board.</p>
                <span class="error">{(error as any)["message"]}</span>
            {/snippet}

            <header>
                <h1>
                    <span style={`color: ${$project.color ? $project.color : 'inherit'};`}>{$project.title}</span>
                    <span class="separator">/</span>
                    <span>{$board.title}</span>
                </h1>
                {#if !onOnshape && !getIsMobile().current}
                    <OnshapeLinks project={$project} />
                {/if}
                <SiteLinks links={$project.linked_sites as ProjectLinkedSite[]} />
                <div style="flex: 1"></div>
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
            </header>
            {@render children()}
        </svelte:boundary>
    {/if}
</div>

<style lang="scss">
header {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0.5rem;
    gap: 0.5rem;

    white-space: nowrap;
    overflow-x: auto;
}
h1 {
    margin: 0 0.5rem;

    .separator {
        color: var(--text-secondary);
    }
}
.page {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
}
</style>