<script lang="ts">
    import { page } from "$app/state";
    import { link } from "$lib/actions";
    import type { ProjectLinkedSite, TypedSubprojectOverviewResponse } from "$lib/data/project";
    import { Settings } from "lucide-svelte";
    import { getProjectContext } from "../../context";
    import ProjectPage from "../../ProjectPage.svelte";
    import { watchOne } from "$lib/pocketbase";
    import { deasyncify } from "$lib/util";
    import type { Readable } from "svelte/store";
    import { Collections } from "$lib/pocketbase/generated-types";
    import BoardOverviewItems from "../../BoardOverviewItems.svelte";
    
    const subprojectId = $derived(page.params.subprojectId);
    
    const project = $derived(getProjectContext().project);
    const subproject = $derived.by(() => {
        if(!project) return null;
        return $project?.expand.subprojects?.find((sp) => sp.id === subprojectId) ?? null;
    });
    
    const subprojectOverview = $derived(subproject ?
        deasyncify(watchOne(Collections.SubprojectOverview, subproject.id)) :
        null
    ) as Readable<TypedSubprojectOverviewResponse | null> | null;
</script>

{#if project && $project !== null && subproject !== null}
    <ProjectPage
        project={$project}
        subtitle={subproject.name}
        linkedSites={subproject.linked_sites as ProjectLinkedSite[]}
        onshapeLinks={subproject}
    >
        {#snippet navItems()}
            <button use:link={`/projects/${$project.id}/subprojects/${subproject.id}/settings`}>
                <Settings />
                Settings
            </button>
        {/snippet}
        
        <div class="content" style="--project-color: {$project.color || 'var(--accent)'}">
            {#if subprojectOverview && $subprojectOverview}
                <BoardOverviewItems
                    cardCount={$subprojectOverview.card_count}
                    finishedCardCount={$subprojectOverview.finished_card_count}
                    overdueCardCount={$subprojectOverview.overdue_card_count}
                    nextDue={$subprojectOverview.next_due}
                />
            {:else}
                <p class="empty">Loading overview...</p>
            {/if}
        </div>
    </ProjectPage>
{:else}
    <p>Loading...</p>
{/if}

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "../../../../overview.scss";

.content {
    padding: 0 1rem 1rem 1rem;
    overflow-y: auto;
    min-height: 0;
    flex: 1;
}

</style>