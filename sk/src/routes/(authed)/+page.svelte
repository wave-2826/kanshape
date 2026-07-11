<script lang="ts">
    import Masonry from "$lib/components/Masonry.svelte";
    import { getPriorityColor } from "$lib/data/cards";
    import { metadata } from "$lib/metadata.js";
    import { AlarmClock, ChevronDown, Clock, ExternalLink, Flag, Folder, Goal, Info, Kanban, SquareKanban, Tag } from "lucide-svelte";

    $effect(() => {
        $metadata.title = "Overview";
    });
</script>

<div class="page">
    <h2>
        <Goal /> My tasks
        <span title="Cards assigned to you or your groups" class="info"><Info /></span>
    </h2>
    <Masonry colWidth="minmax(min(25em, 100%), 1fr)" gridGap="0.5rem" padding="0.5rem">
        <button class="card" onclick={() => {
            // todo: open card panel inline on this page
        }}>
            <span class="path"><Folder /> <span style="color: #ffe36c">Example Project</span> / <span style="color: #ffe36c">Example Board</span> / <span style="color: #6c757d">In Progress</span></span>
            <span class="priority" style="color: {getPriorityColor("critical")}"><Flag /> critical</span>
            <span class="due overdue"><Clock /> Due 1 week ago</span>
            <span class="title">Example card 1 with a very very long name that should maybe wrap</span>
        </button>
        {#each new Array(7) as _, i}
            <button class="card">
                <span class="path"><Folder /> <span style="color: #ffe36c">Example Project</span> / <span style="color: #ffe36c">Example Board</span> / <span style="color: #6c757d">In Progress</span></span>
                <span class="title">Example card {i + 2}</span>
                <span class="priority" style="color: {getPriorityColor("medium")}"><Flag /> medium</span>
                <span class="due"><Clock /> Due in 2 days</span>
            </button>
        {/each}
    </Masonry>
    <!-- todo: could instead be a full page with filtering and stuff? -->
    <button class="see-all"><ChevronDown /> Expand (10)</button>
    
    <h2><SquareKanban /> Projects</h2>
    <div class="horizontal-list">
        {#each [1, 2, 3, 4, 5, 6] as i}
            {@const finishedCards = Math.floor(Math.random() * 28)}
            <div
                class="project button"
                // TODO: open project page
                onclick={() => void(0)}
                onkeydown={(e) => {
                    if(e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void(0);
                    }
                }}
                role="button"
                aria-label={`Open project Example Project ${i}`}
                tabindex="0"
            >
                <span class="title" style="color: #ffe36c">Example Project {i}</span>
                <label>
                    <progress value="{finishedCards}" max="28"></progress>
                    {Math.round(finishedCards / 28 * 100)}%
                </label>
                <span class="unfinished">{28 - finishedCards} / 28 unfinished</span>
                <ul>
                    {#each new Array(Math.floor(Math.random() * 3)) as _, j}
                        <!-- todo: link to board -->
                        <li><a href="#_"><Kanban /> Board {j + 1}</a></li>
                    {/each}
                </ul>
                <ul>
                    {#each new Array(Math.floor(Math.random() * 3)) as _, j}
                        <!-- todo: link to subproject -->
                        <li><a href="#_"><Tag /> Subproject {j + 1}</a></li>
                    {/each}
                </ul>
                {#if Math.random() < 0.5}
                    <span class="due overdue"><Clock /> 2 overdue</span>
                {:else}
                    <span class="due"><Clock /> next due in 3 days</span>
                {/if}
            </div>
        {/each}
    </div>
    
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
    gap: 1rem;
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
    text-align: left;

    width: 12rem;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    --bg-color: var(--bg-primary);

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