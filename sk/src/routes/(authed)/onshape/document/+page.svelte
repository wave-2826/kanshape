<script lang="ts">
    import { metadata } from "$lib/metadata";
    import LinkOnshapeDocument from "../LinkOnshapeDocument.svelte";
    import { getOnshapeContext, LinkedProjectType } from "$lib/components/nav/onshapeContext.svelte";
    import { nav } from "$lib/navigation";

    $effect(() => {
        $metadata.title = "Onshape Document Redirect";
    });

    const linkedProject = $derived(getOnshapeContext().linkedProject);
    
    function redirect() {
        if(!linkedProject) return;
        if(linkedProject.type === LinkedProjectType.Unregistered) return; // Unlinked
        if(linkedProject.type === LinkedProjectType.Unlinked) {
            // Require the user to re-link for the document page
            return;
        }
        nav(linkedProject.subproject ?
            `/projects/${linkedProject.project}/subprojects/${linkedProject.subproject}` :
            `/projects/${linkedProject.project}`);
    }
    $effect(() => {
        if(linkedProject?.type !== LinkedProjectType.Unlinked) redirect();
    });
</script>

{#if linkedProject === null}
    <p>Loading...</p>
{:else if linkedProject.type === LinkedProjectType.Unregistered || linkedProject.type === LinkedProjectType.Unlinked}
    <div class="container">
        <LinkOnshapeDocument />
    </div>
{:else}
    <p>Redirecting to project...</p>
{/if}


<style lang="scss">
.container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 100%;
}
</style>