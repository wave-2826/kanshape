<script lang="ts">
    import { link } from "$lib/actions";
    import { AlarmClock, Check, CheckCheck, Clock, Kanban, ListCheck, Settings, Square, SquareKanban, Tag } from "lucide-svelte";
    import { getProjectContext } from "./context";
    import type { ProjectLinkedSite, TypedProjectOverviewResponse } from "$lib/data/project";
    import ProjectPage from "./ProjectPage.svelte";
    import { deasyncify } from "$lib/util";
    import { watch, watchOne } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import type { Readable } from "svelte/store";
    import ActivityEntry from "../../log/ActivityEntry.svelte";
    import { relativeTime } from "$lib/datetime";
    import { metadata } from "$lib/metadata";

    const project = $derived(getProjectContext().project);

    const projectOverview = $derived($project ?
        deasyncify(watchOne(Collections.ProjectOverview, $project.id)) :
        null
    ) as Readable<TypedProjectOverviewResponse | null> | null;

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
                <div class="horizontal-list overview">
                    <div class="overview-item">
                        <h3><ListCheck /> Cards</h3>
                        <p>{$projectOverview.card_count}</p>
                    </div>
                    <div class="overview-item">
                        <h3><CheckCheck /> Finished cards</h3>
                        <p class="finished">{$projectOverview.finished_card_count}</p>
                    </div>
                    <div class="overview-item">
                        <h3><Clock /> Overdue cards</h3>
                        <p class:overdue={$projectOverview.overdue_card_count > 0}>{$projectOverview.overdue_card_count}</p>
                    </div>
                    {#if $projectOverview.next_due}
                        <div class="overview-item">
                            <!-- TODO: should definitely link to the card -->
                            <h3><Check /> Next due</h3>
                            <p>{relativeTime(new Date($projectOverview.next_due))}</p>
                        </div>
                    {/if}
                </div>
                <label class="progress-label">
                    <progress value={$projectOverview.finished_card_count} max={Math.max(1, $projectOverview.card_count)}></progress>
                    {$projectOverview.card_count > 0 ? Math.round($projectOverview.finished_card_count / $projectOverview.card_count * 100) : 0}% complete
                </label>
            {:else}
                <p class="loading">Loading overview...</p>
            {/if}

            <h2><Kanban /> Boards ({$projectOverview?.boards.length ?? 0})</h2>
            <!-- TODO -->

            <h2><Tag /> Subprojects ({$projectOverview?.subprojects.length ?? 0})</h2>
            <!-- TODO -->

            <!-- TODO: also link to the full log here with a filter or something -->
            <h2><AlarmClock /> Recent activity</h2>
            {#if changes}
                <div class="list">
                    {#if $changes && $changes.items.length > 0}
                        {#each $changes.items as entry}
                            <ActivityEntry entry={entry} hideProject />
                        {/each}
                    {:else if $changes}
                        <p class="loading">No recent activity</p>
                    {:else}
                        <p class="loading">Loading activity...</p>
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

.overview {
    padding-left: 0;
}
.overview-item {
    background-color: var(--bg-primary);
    padding: 0.5rem 0.5rem 0.75rem 0.5rem;
    border-radius: 4px;
    width: 10rem;
    text-align: center;

    h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: var(--font-small);
        color: var(--text-secondary);
    }

    p {
        margin-top: 0.25rem;
        font-size: var(--font-large);
        font-weight: bold;
        color: var(--text-primary);

        &.overdue {
            color: var(--error);
        }
        &.finished {
            color: var(--success);
        }
    }
}

.progress-label {
    margin-top: 0.25rem;
    gap: 1rem;
    width: min(100%, 30rem);
    margin-left: 0.125rem; // intentionally misalign for visual balance
    font-size: var(--font-small);
    color: var(--text-secondary);
}
</style>