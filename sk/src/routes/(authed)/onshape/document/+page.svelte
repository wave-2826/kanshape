<script lang="ts">
    import { metadata } from "$lib/site";
    import LinkOnshapeDocument from "../LinkOnshapeDocument.svelte";
    import { getOnshapeContext, LinkedProjectType } from "$lib/components/nav/onshapeContext.svelte";
    import { nav } from "$lib/navigation";
    import { page } from "$app/state";

    $effect(() => {
        $metadata.title = "Onshape Document Redirect";
    });

    if(!page.url.searchParams.has("onshape")) {
        const params = page.url.searchParams;
        const documentId = params.get("documentId");
        const wvmId = params.get("workspaceId");
        const elementId = params.get("elementId");
        if(documentId && wvmId && elementId) {
            console.log("Redirecting to onshape document page with rewritten query params.");
            nav(`?onshape_documentId=${documentId}&onshape_wvm=w&onshape_wvmId=${wvmId}&onshape_elementId=${elementId}&onshape=tab`);
        }
    }

    const linkedProject = $derived(getOnshapeContext().linkedProject);
    
    function redirect() {
        if(!linkedProject) return;
        if(linkedProject.type === LinkedProjectType.Unregistered) return; // Unlinked
        if(linkedProject.type === LinkedProjectType.Unlinked) {
            // Navigate to the home page if unlinked
            nav("/");
            return;
        }
        nav(linkedProject.subproject ?
            `/projects/${linkedProject.project}/subprojects/${linkedProject.subproject}` :
            `/projects/${linkedProject.project}`);
    }
    $effect(() => {
        if(!page.url.searchParams.has("onshape")) return;
        redirect();
    });
</script>

<div class="container">
    {#if linkedProject === null}
        <p>Loading...</p>
    {:else if linkedProject.type === LinkedProjectType.Unregistered}
        <LinkOnshapeDocument allowUnlinked />
    {:else}
        <!-- redirecting -->
        <p>Redirecting to project...</p>
    {/if}
</div>


<style lang="scss">
.container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 100%;
}
</style>