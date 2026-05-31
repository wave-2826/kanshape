<script lang="ts">
    import { metadata } from "$lib/metadata";
    import { goto } from "$app/navigation";
    import LinkOnshapeDocument from "../LinkOnshapeDocument.svelte";
    import { getOnshapeContext } from "../onshapeContext";

    $effect(() => {
        $metadata.title = "Onshape Document Redirect";
    });

    const linkedProject = $derived(getOnshapeContext().linkedProject);
    
    function redirect() {
        goto(linkedProject?.subproject ?
            `/projects/${linkedProject?.project}/subprojects/${linkedProject?.subproject}?onshape=true` :
            `/projects/${linkedProject?.project}?onshape=true`);
    }
    $effect(() => {
        if(linkedProject?.project) redirect();
    });
</script>

{#if linkedProject === null}
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
    height: 100%;
}
</style>