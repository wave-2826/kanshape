<script lang="ts">
    import { page } from "$app/state";
    import { Kanban, List, Settings } from "lucide-svelte";
    import type { Snippet } from "svelte";
    import { getProjectContext } from "../../../context";
    import type { ProjectLinkedSite } from "$lib/data/project";
    import { link } from "$lib/actions";
    import ProjectPage from "../../../ProjectPage.svelte";
    import { getBoardContext } from "../../../context";

    const {
        children
    }: {
        children: Snippet
    } = $props();

    const project = $derived(getProjectContext().project);
    const board = $derived(getBoardContext().board);
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

            <button use:link={`/projects/${$project.id}/boards/${$board.id}/settings`}>
                <Settings />
                Settings
            </button>
        {/snippet}
        {@render children()}
    </ProjectPage>
{:else}
    <p>Loading...</p>
{/if}