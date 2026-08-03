<script lang="ts">
    import Masonry from "$lib/components/Masonry.svelte";
    import { getPriorityColor } from "$lib/data/cards";
    import { relativeTime } from "$lib/datetime";
    import { metadata } from "$lib/metadata.js";
    import { nav } from "$lib/navigation";
    import { watch } from "$lib/pocketbase";
    import { Collections, type AssignedCardsResponse } from "$lib/pocketbase/generated-types";
    import { deasyncify } from "$lib/util";
    import { AlarmClock, ChevronDown, ChevronUp, Clock, ExternalLink, Flag, Folder, Goal, Info, Kanban, SquareKanban, Tag } from "@lucide/svelte";
    import type { ListResult } from "pocketbase";
    import { writable, type Readable } from "svelte/store";
    import ActivityEntry from "./log/ActivityEntry.svelte";
    import type { TypedProjectOverviewResponse } from "$lib/data/project";

    $effect(() => {
        $metadata.title = "Overview";
    });

    let expandTasks = $state(false);

    const myTasks = $derived(writable<ListResult<AssignedCardsResponse>>());
    $effect(() => {
        const unsubImmediate = Symbol("unsubImmediate");
        let unsub: null | typeof unsubImmediate | (() => void) = null;

        (async () => {
            const result = await watch(Collections.AssignedCards, {
                // filtering is done server-side based on auth
                sort: "-priority_number,-due_by",
            }, 0, expandTasks ? 50 : 8);

            // we always subscribe to make sure it's cleaned up
            const unsubscribe = result.subscribe((value) => {
                myTasks.set(value);
            });

            if(unsub === unsubImmediate) {
                unsubscribe();
                return;
            }
            unsub = unsubscribe;
        })();

        return () => {
            if(unsub === null) {
                unsub = unsubImmediate;
            } else if(unsub !== unsubImmediate) {
                unsub();
            }
        };
    });

    const projects = $derived(deasyncify(watch(Collections.ProjectOverview, {}, 0, 0, {
        // technically cards too but that's expensive
        pollOnChange: [Collections.Projects, Collections.Boards, Collections.Subprojects]
    })));

    const changes = $derived(deasyncify(watch(Collections.ActivityLogPreview, {
        sort: "-date"
    }, 0, 10, {
        pollOnChange: [Collections.ActivityLog]
    })));
</script>

<div class="page">
    {#if myTasks}
        <h2>
            <Goal /> My tasks
            <span title="Cards assigned to you or your groups" class="info"><Info /></span>
        </h2>
        {#if $myTasks}
            <Masonry colWidth="minmax(min(25em, 100%), 1fr)" gridGap="0.5rem" padding="0.5rem" items={$myTasks.items}>
                {#each $myTasks.items as task}
                    <button class="card" onclick={() => {
                        nav(`/projects/${task.project_id}/boards/${task.board_id}?card=${task.id}`);
                    }} class:critical={task.priority === "critical"}>
                        <span class="path">
                            <Folder class={$css("icon")} />
                            <span style="color: {task.project_color ?? "var(--text-primary)"}">{task.project_title}</span> /
                            <span style="color: {task.project_color ?? "var(--text-primary)"}">{task.board_title}</span> /
                            <span style="color: {task.section_color ?? "var(--text-primary)"}">{task.section_title}</span>
                        </span>
                        <span class="title" class:untitled={!task.title.trim()}>{task.title.trim() ? task.title : "Untitled"}</span>
                        {#if task.priority && task.priority !== "low"}
                            <span class="priority" style="color: {getPriorityColor(task.priority)}">
                                <Flag class={$css("icon")} /> {task.priority}
                            </span>
                        {/if}
                        {#if task.due_by}
                            <span class="due" class:overdue={new Date(task.due_by) < new Date()}>
                                <Clock class={$css("icon")} /> Due {relativeTime(new Date(task.due_by))}
                            </span>
                        {/if}
                    </button>
                {/each}
            </Masonry>
            <!-- todo: could instead be a full page with filtering and stuff? -->
            {#if $myTasks.totalItems > $myTasks.items.length || expandTasks}
                <button class="see-all" onclick={() => {
                    expandTasks = !expandTasks;
                }}>
                    {#if expandTasks}
                        <ChevronUp /> Collapse
                    {:else}
                        <ChevronDown /> Expand ({$myTasks.totalItems})
                    {/if}
                </button>
            {/if}
        {:else}
            <p class="empty">Loading tasks...</p>
        {/if}
    {/if}
    
    {#if projects}
        <h2><SquareKanban /> Projects</h2>
        {#if $projects}
            <div class="horizontal-list">
                {#each $projects.items as project}
                    <div
                        class="project button"
                        onclick={(e) => {
                            if(e.target instanceof HTMLAnchorElement) return; // don't navigate if clicking a link
                            nav(`/projects/${project.id}`);
                        }}
                        onkeydown={(e) => {
                            if(e.target instanceof HTMLAnchorElement) return; // don't navigate if pressing enter on a link
                            if(e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                nav(`/projects/${project.id}`);
                            }
                        }}
                        style="--project-color: {project.color || 'var(--accent)'}"
                        role="button"
                        aria-label={`Open project ${project.title}`}
                        tabindex="0"
                    >
                        <span class="title" style="color: {project.color ?? 'inherit'}">{project.title}</span>
                        <label class="progress-label">
                            <progress value={project.finished_card_count} max={Math.max(1, project.card_count)}></progress>
                            {project.card_count > 0 ? Math.round(project.finished_card_count / project.card_count * 100) : 0}%
                        </label>
                        <span class="unfinished">
                            {project.card_count} card{project.card_count !== 1 ? 's' : ''}<!--
                            -->{#if project.card_count > project.finished_card_count};
                                {project.card_count - project.finished_card_count} unfinished
                            {/if}
                        </span>
                        <ul>
                            {#each project.boards as board}
                                <li><a href="/projects/{project.id}/boards/{board.id}"><Kanban class={$css("icon")} /> {board.title}</a></li>
                            {/each}
                        </ul>
                        <ul>
                            {#each project.subprojects as subproject}
                                <li><a href="/projects/{project.id}/subprojects/{subproject.id}"><Tag class={$css("icon")} /> {subproject.name}</a></li>
                            {/each}
                        </ul>
                        {#if project.overdue_card_count > 0}
                            <span class="due overdue"><Clock class={$css("icon")} /> {project.overdue_card_count} overdue</span>
                        {:else if project.next_due}
                            <span class="due"><Clock class={$css("icon")} /> next due {relativeTime(new Date(project.next_due))}</span>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
    
    <h2><AlarmClock /> Recent activity <a href="/log"><ExternalLink /> Activity log</a></h2>
    {#if changes}
        <div class="list">
            {#if $changes && $changes.items.length > 0}
                {#each $changes.items as entry}
                    <ActivityEntry entry={entry} />
                {/each}
            {:else if $changes}
                <p class="empty">No recent activity</p>
            {:else}
                <p class="empty">Loading activity...</p>
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
@use "./overview.scss";

.page {
    padding: 1rem;
    overflow-y: auto;
    max-height: 100%;
}

.icon {
    width: 0.8em;
    height: 0.8em;
}

.card {
    display: grid;
    grid-template-rows: 1.125rem auto;
    grid-template-columns: 1fr auto auto;
    grid-template-areas:
        "path path priority"
        "title title due";
    
    gap: 0 1rem;
    padding: 0.25rem 0.5rem 0.5rem 0.5rem;
    border-radius: 4px;
    --bg-color: var(--bg-primary);
    text-align: left;

    &.critical {
        border-top: 1px solid var(--error);
    }

    .path {
        grid-area: path;
        color: var(--text-tertiary);
        font-size: var(--font-tiny);
        display: flex;
        align-items: center;
        gap: 0.25rem;
        white-space: nowrap;
        overflow: hidden;
    }

    .title {
        grid-area: title;
        font-weight: bold;
        color: var(--text-primary);

        &.untitled {
            color: var(--text-tertiary);
            font-style: italic;
        }
    }

    .priority { grid-area: priority; }
    .due { grid-area: due; }
    .priority, .due {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        justify-content: right;
        align-self: flex-start;
        color: var(--text-secondary);
        font-size: var(--font-small);
    }

    .overdue {
        color: var(--error);
    }
}

.see-all {
    --bg-color: transparent;
    font-size: var(--font-small);
    width: 100%;
}

.project {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
    align-self: flex-start;
    text-align: left;

    width: 12rem;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    --bg-color: var(--bg-primary);

    .title {
        font-size: var(--font-medium);
        margin-bottom: 0.25rem;
        // force wrap if necessary
        max-width: 100%;
        overflow-wrap: break-word;
    }

    .progress-label {
        font-size: var(--font-tiny);
    }

    ul {
        list-style-type: none;
        padding: 0;
        margin: 0;

        &:empty {
            display: none;
        }

        li {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            word-break: break-word;

            .icon {
                color: var(--text-secondary);
                vertical-align: middle;
            }
        }
    }

    .due {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-top: 0.25rem;
        color: var(--text-secondary);
        font-size: var(--font-tiny);

        &.overdue {
            color: var(--error);
        }
    }
}
</style>