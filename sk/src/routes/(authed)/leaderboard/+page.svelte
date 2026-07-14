<script lang="ts">
    import { metadata } from "$lib/metadata";
    import { watch } from "$lib/pocketbase";
    import { authModel } from "$lib/pocketbase/auth";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { deasyncify } from "$lib/util";
    import { Trophy, Medal, CheckCheck, PlusSquare, UserPlus, Globe, Folder, SquarePlus } from "lucide-svelte";

    // technically duplicated with the nav data but... meh
    const projects = $derived(deasyncify(watch(Collections.Projects, {
        sort: "title",
        requestKey: null
    })));
    const currentUser = $derived($authModel?.id);

    let selectedProjectId = $state<string | null>(null);
    let selectedProjectName = $derived($projects ? $projects.items.find(p => p.id === selectedProjectId)?.title : null);

    $effect(() => {
        $metadata.title = selectedProjectName ? `Leaderboard: ${selectedProjectName}` : "Leaderboard";
    });

    const leaderboardFilter = $derived(
        selectedProjectId ? `project = "${selectedProjectId}"` : "project = null"
    );

    const sortTypes = {
        tasks_completed: { name: "Tasks completed", sort: "-tasks_completed,-tasks_created",  color: "var(--success)" },
        tasks_created:   { name: "Tasks created",   sort: "-tasks_created,-tasks_completed",  color: "var(--accent)" },
        tasks_assigned:  { name: "Tasks assigned",  sort: "-tasks_assigned,-tasks_completed", color: "var(--warning-medium)" }
    } as const;
    let sortTypeKey = $state<keyof typeof sortTypes>("tasks_completed");
    const sortType = $derived(sortTypes[sortTypeKey]);

    const leaderboard = $derived(deasyncify(watch(Collections.Leaderboard, {
        expand: "user,project",
        sort: sortType.sort,
        filter: leaderboardFilter,
    }, 0, 100)));

    function getRankClass(index: number) {
        if(index === 0) return "gold";
        if(index === 1) return "silver";
        if(index === 2) return "bronze";
        return "";
    }
</script>

<div class="page">
    <header>
        <div class="project-select">
            <button
                class="project-button"
                class:selected={selectedProjectId === null}
                onclick={() => selectedProjectId = null}
            >
                <Globe /> Global
            </button>
            {#if $projects}
                {#each $projects.items as project}
                    <button
                        class="project-button"
                        class:selected={selectedProjectId === project.id}
                        onclick={() => selectedProjectId = project.id}
                        style={project.color ? `color: ${project.color}` : ""}
                    >
                        <Folder /> {project.title}
                    </button>
                {/each}
            {/if}
        </div>
        <div class="multi-button type-selector">
            {#each Object.entries(sortTypes) as [key, type]}
                <button
                    onclick={() => sortTypeKey = key as typeof sortTypeKey}
                    style="color: {type.color}"
                    class:selected={sortTypeKey === key}
                >{type.name}</button>
            {/each}
        </div>
    </header>

    <div class="content">
        {#if leaderboard && $leaderboard}
            {@const entries = $leaderboard.items}
            {#if entries.length > 0}
                <div class="leaderboard-list">
                    {#each entries as entry, i}
                        {@const isCurrentUser = entry.user === currentUser}
                        <!-- TODO: link to user profiles or something -->
                        <div class="entry" class:current-user={isCurrentUser} class:top-three={i < 3}>
                            <div class="rank {getRankClass(i)}">
                                {#if i === 0}<Trophy />
                                {:else if i === 1}<Medal />
                                {:else if i === 2}<Medal />
                                {:else}#{i + 1}
                                {/if}
                            </div>
                            <span class="name">
                                {entry.expand?.user?.name || entry.expand?.user?.username || "Unknown"}
                            </span>
                            <span class="username">
                                {entry.expand?.user?.username ? `@${entry.expand.user.username}` : ""}
                            </span>
                            <div class="stat" title="{sortType.name}" style="color: {sortType.color}">
                                <span class="stat-value">{entry[sortTypeKey] ?? 0}</span>
                                <span class="stat-label">{sortType.name}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <p class="description">No leaderboard data yet.</p>
            {/if}
        {:else}
            <p class="description">Loading leaderboard...</p>
        {/if}
    </div>
</div>

<style lang="scss">
.page {
    display: flex;
    flex-direction: column;
    max-height: 100%;
    gap: 1rem;
}

header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.project-select {
    display: inline-flex;
    flex-direction: row;
    overflow-x: auto;
    gap: 0.25rem;
    white-space: nowrap;
    padding: 1rem 1rem 0.5rem 1rem;

    .project-button {
        font-size: var(--font-small);
        color: var(--text-secondary);

        &.selected {
            color: var(--text-primary);
        }
    
        :global(svg) {
            width: 1em;
            height: 1em;
        }
    }
}

.type-selector {
    align-self: flex-start;
    margin-left: 1rem;

    button {
        padding: 0.25rem 1rem;
    }
}


.content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;

    display: flex;
    flex-direction: column;
    align-items: center;
}
.leaderboard-list {
    width: 100%;
    max-width: 60rem;

    display: grid;
    grid-template-columns: auto repeat(3, minmax(auto, 12rem)) auto;
    
    gap: 0.5rem;
    padding: 0 1rem 1rem 1rem;
}

.entry {
    --padding: 0;
    grid-column: span 5;
    position: relative;

    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: var(--bg-primary);
    border-radius: 4px;
    
    &.current-user {
        border: 1px solid var(--accent);
        background-color: color-mix(in srgb, var(--accent) 5%, var(--bg-primary));
    }

    &.top-three {
        .rank {
            &.gold :global(svg) { color: #ffd700; }
            &.silver :global(svg) { color: #c0c0c0; }
            &.bronze :global(svg) { color: #cd7f32; }
        }

        .stat-label {
            display: block;
        }
    }
}

@media (min-width: 800px) {
    // first three entries get special treatment as single-column "pedestal" items
    .entry.top-three {
        grid-row: 1;
        flex-direction: column;
        align-self: end;
        margin-top: 2rem;
        padding: 0.5rem;
        gap: 0.25rem;

        .rank {
            position: absolute;
            --icon-size: 2rem;
            top: -2rem;
        }
    }
    .entry:nth-child(1) { grid-column: 3; --padding: 3.5rem; }
    .entry:nth-child(2) { grid-column: 2; --padding: 2rem; }
    .entry:nth-child(3) { grid-column: 4; --padding: 0.5rem; }
}

.rank {
    --icon-size: 1.5rem;

    width: 2.5rem;
    flex-shrink: 0;
    font-size: var(--font-medium);
    color: var(--text-secondary);

    :global(svg) {
        width: var(--icon-size);
        height: var(--icon-size);
    }
}

.name {
    font-size: var(--font-medium);
}
.username {
    flex: 1;
    margin-left: 0.5rem;
    font-size: var(--font-tiny);
    color: var(--text-tertiary);
    padding-bottom: var(--padding);
}

.stat {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 0.15rem;

    .stat-value {
        font-size: var(--font-medium);
        font-weight: 700;
        line-height: 1;
    }
    .stat-label {
        display: none;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);
        letter-spacing: 0.05em;
    }
}

.description {
    padding: 1rem;
    text-align: center;
    font-size: var(--font-small);
    color: var(--text-tertiary);
}
</style>