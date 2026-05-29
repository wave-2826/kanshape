<script lang="ts">
    import { page } from "$app/state";
    import type { ProjectLinkedSite } from "$lib/data/project";
    import { getProjectContext } from "../../context";
    import ProjectPage from "../../ProjectPage.svelte";

    const subprojectId = $derived(page.params.subprojectId);
    
    const project = $derived(getProjectContext().project);
    const subproject = $derived.by(() => {
        if(!project) return null;
        return $project?.expand.subprojects?.find((sp) => sp.id === subprojectId) ?? null;
    });
</script>

{#if project && $project !== null && subproject !== null}
    <ProjectPage
        project={$project}
        subtitle={subproject.name}
        linkedSites={subproject.linked_sites as ProjectLinkedSite[]}
        onshapeLinks={subproject}
    >
        <span></span>
    </ProjectPage>
{:else}
    <p>Loading...</p>
{/if}