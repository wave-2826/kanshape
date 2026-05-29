<script lang="ts">
    import { link } from "$lib/actions";
    import { Settings } from "lucide-svelte";
    import { getProjectContext } from "./context";
    import type { ProjectLinkedSite } from "$lib/data/project";
    import ProjectPage from "./ProjectPage.svelte";

    const project = $derived(getProjectContext().project);
</script>

{#if project && $project !== null}
    <ProjectPage project={$project} linkedSites={$project.linked_sites as ProjectLinkedSite[]} onshapeLinks={$project}>
        {#snippet navItems()}
            <button use:link={`/projects/${$project.id}/settings`}>
                <Settings />
                Settings
            </button>
        {/snippet}

        <span></span>
    </ProjectPage>
{/if}

<style lang="scss">
</style>