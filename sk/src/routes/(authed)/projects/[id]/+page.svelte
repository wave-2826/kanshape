<script lang="ts">
  import BoardOverviewItems from './BoardOverviewItems.svelte';

    import { link } from "$lib/actions";
    import { AlarmClock, Check, CheckCheck, Clock, Kanban, ListCheck, Settings, Square, SquareKanban, Tag } from "lucide-svelte";
    import { getProjectContext } from "./context";
    import type { ProjectLinkedSite, TypedBoardOverviewResponse, TypedProjectOverviewResponse, TypedSubprojectOverviewResponse } from "$lib/data/project";
    import ProjectPage from "./ProjectPage.svelte";
    import { deasyncify } from "$lib/util";
    import { watch, watchOne } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import type { Readable } from "svelte/store";
    import ActivityEntry from "../../log/ActivityEntry.svelte";
    import { relativeTime } from "$lib/datetime";
    import { metadata } from "$lib/metadata";
    import type { ListResult } from "pocketbase";
    import BoardButtons from "./boards/[boardId]/(kanban)/BoardButtons.svelte";

    const project = $derived(getProjectContext().project);

    const projectOverview = $derived($project ?
        deasyncify(watchOne(Collections.ProjectOverview, $project.id)) :
        null
    ) as Readable<TypedProjectOverviewResponse | null> | null;

    const boards = $derived($project ?
        deasyncify(watch(Collections.BoardOverview, {
            filter: `project_id = "${$project.id}"`,
            sort: "title"
        }, 0, 100, {
            pollOnChange: [Collections.Boards]
        })) :
        null
    ) as Readable<ListResult<TypedBoardOverviewResponse> | null> | null;

    const subprojects = $derived($project ?
        deasyncify(watch(Collections.SubprojectOverview, {
            filter: `project_id = "${$project.id}"`,
            sort: "name"
        }, 0, 100, {
            pollOnChange: [Collections.Subprojects]
        })) :
        null
    ) as Readable<ListResult<TypedSubprojectOverviewResponse> | null> | null;

    const changes = $derived($project ? deasyncify(watch(Collections.ActivityLogPreview, {
        filter: `project_id = "${$project.id}"`,
        sort: "-date"
    }, 0, 10, {
        pollOnChange: [Collections.ActivityLog]
    })) : null);

    $effect(() => {
        $metadata.title = $project?.title ?? "";
    });
</script>

{#if project && $project !== null}
    <ProjectPage project={$project} linkedSites={$project.linked_sites as ProjectLinkedSite[]} onshapeLinks={$project}>
        {#snippet navItems()}
            <button use:link={`/projects/${$project.id}/settings`}>
                <Settings />
                Settings
            </button>
        {/snippet}
        
        <div class="content" style="--project-color: {$project.color || 'var(--accent)'}">
            {#if projectOverview && $projectOverview}
                <BoardOverviewItems
                    cardCount={$projectOverview.card_count}
                    finishedCardCount={$projectOverview.finished_card_count}
                    overdueCardCount={$projectOverview.overdue_card_count}
                    nextDue={$projectOverview.next_due}
                />
            {:else}
                <p class="empty">Loading overview...</p>
            {/if}

            <h2><Kanban /> Boards ({$projectOverview?.boards.length ?? 0})</h2>
            {#if boards && $boards}
                {#if $boards.items.length > 0}
                    <div class="list board-list">
                        {#each $boards.items as board}
                            <div class="button board" use:link={`/projects/${$project.id}/boards/${board.id}`}>
                                <h3>{board.title}</h3>
                                <div class="nav">
                                    <BoardButtons projectId={$project.id} boardId={board.id} buttonClass={$css("nav-button")} />
                                </div>
                                
                                <div class="info">
                                    <p><ListCheck /> {board.card_count} cards</p>
                                    <p class:finished={board.finished_card_count > 0}><CheckCheck /> {board.finished_card_count} done</p>
                                    {#if board.overdue_card_count > 0}
                                        <p class="due overdue"><Clock /> {board.overdue_card_count} overdue</p>
                                    {:else if board.next_due !== null}
                                        <p class="due"><Clock /> Next due {relativeTime(new Date(board.next_due))}</p>
                                    {/if}
                                </div>
                                
                                <label class="progress-label">
                                    {board.card_count > 0 ? Math.round(board.finished_card_count / board.card_count * 100) : 0}%
                                    <progress value={board.finished_card_count} max={Math.max(1, board.card_count)}></progress>
                                </label>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="empty">No boards</p>
                {/if}
            {:else}
                <p class="empty">Loading boards...</p>
            {/if}

            <h2><Tag /> Subprojects ({$projectOverview?.subprojects.length ?? 0})</h2>
            {#if subprojects && $subprojects}
                {#if $subprojects.items.length > 0}
                    <div class="horizontal-list">
                        {#each $subprojects.items as subproject}
                            <button class="subproject" use:link={`/projects/${$project.id}/subprojects/${subproject.id}`}>
                                <h3>{subproject.name}</h3>
                                <p><ListCheck /> {subproject.card_count} cards</p>
                                <p class:finished={subproject.finished_card_count > 0}><CheckCheck /> {subproject.finished_card_count} done</p>
                                {#if subproject.overdue_card_count > 0}
                                    <p class="due overdue"><Clock /> {subproject.overdue_card_count} overdue</p>
                                {:else if subproject.next_due !== null}
                                    <p class="due"><Clock /> Next due {relativeTime(new Date(subproject.next_due))}</p>
                                {/if}
                            </button>
                        {/each}
                    </div>
                {:else}
                    <p class="empty">No subprojects</p>
                {/if}
            {:else}
                <p class="empty">Loading subprojects...</p>
            {/if}

            <!-- TODO: also link to the full log here with a filter or something -->
            <h2><AlarmClock /> Recent activity</h2>
            {#if changes}
                <div class="list">
                    {#if $changes && $changes.items.length > 0}
                        {#each $changes.items as entry}
                            <ActivityEntry entry={entry} hideProject />
                        {/each}
                    {:else if $changes}
                        <p class="empty">No recent activity</p>
                    {:else}
                        <p class="empty">Loading activity...</p>
                    {/if}
                </div>
            {/if}
        </div>
    </ProjectPage>
{/if}

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "../../overview.scss";

.content {
    padding: 0 1rem 1rem 1rem;
    overflow-y: auto;
    min-height: 0;
    flex: 1;
}

.board-list {
    container-type: inline-size;
}
.board, .subproject {
    --bg-color: var(--bg-primary);
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;

    p {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        &.due {
            color: var(--text-secondary);
        }

        &.overdue {
            color: var(--error);
        }
        &.finished {
            color: var(--success);
        }
    }

    :global(svg) {
        width: 1em;
        height: 1em;
    }
}
.board {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    grid-template-areas:
        "title nav"
        "info progress";
    gap: 0.25rem 1rem;

    h3 {
        grid-area: title;
        align-self: start;
        color: var(--project-color);
        word-break: break-word;
    }
    .nav {
        grid-area: nav;
        display: flex;
        gap: 0.25rem;
        font-size: var(--font-small);
        --bg-color: var(--bg-secondary);
        justify-self: end;
        margin-bottom: -0.25rem;

        .nav-button {
            padding: 0.25rem 0.5rem;
        }
    }
    .info {
        grid-area: info;
        font-size: var(--font-small);
        display: flex;
        gap: 0.25rem 1.5rem;
        flex-wrap: wrap;
        white-space: nowrap;
    }
    
    .progress-label {
        grid-area: progress;
        width: 18rem;
    }
}

.subproject {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    min-width: 10rem;
    max-width: 20rem;
    text-align: left;

    h3 {
        color: var(--project-color);
        margin-bottom: 0.25rem;
        word-break: break-word;
    }
}

@container (max-width: 35rem) {
    .board {
        grid-template-columns: 1fr;
        grid-template-areas:
            "title"
            "nav"
            "info"
            "progress";
        gap: 0.5rem;

        .nav {
            justify-self: start;
        }
        .info {
            padding: 0 0.5rem;
        }
        .progress-label {
            width: 100%;
            padding: 0 0.5rem;
        }
    }
}
</style>