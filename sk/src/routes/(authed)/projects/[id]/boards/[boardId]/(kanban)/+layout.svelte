<script lang="ts">
    import BoardButtons from './BoardButtons.svelte';
    import { Settings } from "@lucide/svelte";
    import type { Snippet } from "svelte";
    import { getProjectContext } from "../../../context";
    import type { ProjectLinkedSite } from "$lib/data/project";
    import ProjectPage from "../../../ProjectPage.svelte";
    import { getBoardContext } from "../../../context";
    import { metadata } from "$lib/site";

    const {
        children
    }: {
        children: Snippet
    } = $props();

    const project = $derived(getProjectContext().project);
    const board = $derived(getBoardContext().board);

    $effect(() => {
        $metadata.title = $board?.title ?? "";
    });
</script>

{#if project && $project !== null && board && $board !== null}
    <ProjectPage
        project={$project}
        subtitle={$board.title}
        linkedSites={$board.linked_sites as ProjectLinkedSite[]}
    >
        {#snippet navItems()}
            <div class="multi-button">
                <BoardButtons projectId={$project.id} boardId={$board.id} />
            </div>

            <a class="button" href={`/projects/${$project.id}/boards/${$board.id}/settings`}>
                <Settings />
                Settings
            </a>
        {/snippet}
        {@render children()}
    </ProjectPage>
{:else}
    <p>Loading...</p>
{/if}