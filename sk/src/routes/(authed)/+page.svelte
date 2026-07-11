<script lang="ts">
    import Masonry from "$lib/components/Masonry.svelte";
    import { getPriorityColor } from "$lib/data/cards";
    import { relativeTime } from "$lib/datetime";
    import { metadata } from "$lib/metadata.js";
    import { nav } from "$lib/navigation";
    import { watch } from "$lib/pocketbase";
    import { authModel } from "$lib/pocketbase/auth";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { deasyncify } from "$lib/util";
    import { AlarmClock, ChevronDown, Clock, ExternalLink, Flag, Folder, Goal, Info, Kanban, SquareKanban, Tag } from "lucide-svelte";
    import type { ListResult } from "pocketbase";
    import { derived, type Readable } from "svelte/store";

    $effect(() => {
        $metadata.title = "Overview";
    });

    const myTasks = $derived($authModel ? deasyncify(watch(Collections.AssignedCards, {
        // filtering is done server-side based on auth
        sort: "-priority_number,-due_by",
    }, 0, 8)) : null);

    const projects = $derived(deasyncify(watch(Collections.ProjectOverview, {}, 0, 0))) as Readable<ListResult<
        {
            id: string,
            title: string,
            color: string,
            boards: { id: string; title: string }[],
            subprojects: { id: string; name: string }[],
            card_count: number,
            finished_card_count: number,
            overdue_card_count: number,
            next_due: string | null
        }
    > | null>;
</script>

<div class="page">
    {#if myTasks}
        <h2>
            <Goal /> My tasks
            <span title="Cards assigned to you or your groups" class="info"><Info /></span>
        </h2>
        {#if $myTasks}
            <Masonry colWidth="minmax(min(25em, 100%), 1fr)" gridGap="0.5rem" padding="0.5rem">
                {#each $myTasks.items as task}
                    <button class="card" onclick={() => {
                        // todo: open card panel inline on this page
                    }} class:critical={task.priority === "critical"}>
                        <span class="path">
                            <Folder />
                            <span style="color: {task.project_color ?? "var(--text-primary)"}">{task.project_title}</span> /
                            <span style="color: {task.project_color ?? "var(--text-primary)"}">{task.board_title}</span> /
                            <span style="color: {task.section_color ?? "var(--text-primary)"}">{task.section_title}</span>
                        </span>
                        <span class="title">{task.title}</span>
                        {#if task.priority}
                            <span class="priority" style="color: {getPriorityColor(task.priority)}"><Flag /> {task.priority}</span>
                        {/if}
                        {#if task.due_by}
                            <span class="due" class:overdue={new Date(task.due_by) < new Date()}><Clock /> Due {relativeTime(new Date(task.due_by))}</span>
                        {/if}
                    </button>
                {/each}
            </Masonry>
            <!-- todo: could instead be a full page with filtering and stuff? -->
            {#if $myTasks.totalItems > $myTasks.items.length}
                <button class="see-all"><ChevronDown /> Expand ({$myTasks.totalItems})</button>
            {/if}
        {:else}
            <p class="loading">Loading tasks...</p>
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
                        role="button"
                        aria-label={`Open project ${project.title}`}
                        tabindex="0"
                    >
                        <span class="title" style="color: {project.color ?? 'inherit'}">{project.title}</span>
                        <label>
                            <progress value={project.finished_card_count} max={project.card_count}></progress>
                            {Math.round(project.finished_card_count / project.card_count * 100)}%
                        </label>
                        <span class="unfinished">
                            {project.card_count} card{project.card_count !== 1 ? 's' : ''}<!--
                            -->{#if project.card_count > project.finished_card_count};
                                {project.card_count - project.finished_card_count} unfinished
                            {/if}
                        </span>
                        <ul>
                            {#each project.boards as board}
                                <!-- todo: link to board -->
                                <li><a href="/projects/{project.id}/boards/{board.id}"><Kanban /> {board.title}</a></li>
                            {/each}
                        </ul>
                        <ul>
                            {#each project.subprojects as subproject}
                                <!-- todo: link to subproject -->
                                <li><a href="/projects/{project.id}/subprojects/{subproject.id}"><Tag /> {subproject.name}</a></li>
                            {/each}
                        </ul>
                        {#if project.overdue_card_count > 0}
                            <span class="due overdue"><Clock /> {project.overdue_card_count} overdue</span>
                        {:else if project.next_due}
                            <span class="due"><Clock /> next due {relativeTime(new Date(project.next_due))}</span>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
    
    <h2><AlarmClock /> Recent activity <a href="/log"><ExternalLink /> Activity log</a></h2>
    <div class="list">
        {#each new Array(10) as _, i}
            <button class="activity" onclick={() => {
                // todo: open relevant card or project page
            }}>
                <span class="time">{i + 1}m ago</span>
                <span class="description">
                    <span class="user">User</span> moved card <span class="card-name">Example card 1</span> to <span class="section">In Progress</span> in <span style="color: #ffe36c">Example Project</span> / <span style="color: #ffe36c">Example Board</span>
                </span>
            </button>
        {/each}
    </div>
</div>

<style lang="scss">
.page {
    padding: 1rem;
    overflow-y: auto;
    max-height: 100%;
}

.loading {
    padding: 0.5rem;
    color: var(--text-secondary);
}

h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:not(:first-child) {
        margin-top: 2rem;
    }

    span {
        line-height: 0;
        :global(svg) {
            width: 0.8em;
            height: 0.8em;
            color: var(--text-secondary);
        }
    }

    a {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: var(--font-small);
        margin-left: 0.5rem;
        text-decoration: none;

        :global(svg) {
            width: 0.8em;
            height: 0.8em;
        }
    }
}

.list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
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

        :global(svg) {
            width: 0.8em;
            height: 0.8em;
        }
    }

    .title {
        grid-area: title;
        font-weight: bold;
        color: var(--text-primary);
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

        :global(svg) {
            width: 0.8em;
            height: 0.8em;
        }
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

.horizontal-list {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    padding: 0.5rem;
    overflow-x: auto;
    flex-wrap: nowrap;
    position: relative;

    > * {
        flex: 0 0 auto;
    }

    // fade
    padding-right: 2rem;
    mask-image: linear-gradient(to right, black 0%, black calc(100% - 2rem), transparent 100%);
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
    }

    label {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
        font-size: var(--font-tiny);
        width: 100%;
    }
    progress {
        flex: 1;
        width: 100%;
        height: 0.5rem;
        border-radius: 2px;
        overflow: hidden;
        appearance: none;
        background-color: var(--bg-secondary);
        border: none;

        &::-webkit-progress-bar {
            background-color: var(--bg-secondary);
        }
        &::-webkit-progress-value {
            background-color: var(--accent);
        }
        // has to be separate or webkit drops the style
        &::-moz-progress-bar {
            background-color: var(--accent);
        }
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

            :global(svg) {
                width: 0.8em;
                height: 0.8em;
                color: var(--text-secondary);
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

.activity {
    display: flex;
    flex-direction: row;
    align-items: center;
    text-align: left;
    gap: 1rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    --bg-color: var(--bg-primary);

    .time {
        color: var(--text-tertiary);
        font-size: var(--font-tiny);
        white-space: nowrap;
    }

    .description {
        color: var(--text-secondary);
        span {
            color: var(--text-primary);
            margin: 0 0.125rem;
        }
        .user {
            color: var(--accent);
        }
        .card-name {
            font-style: italic;
        }
    }
}
</style>