<script lang="ts">
    import { getConfig } from "$lib/config";
    import { metadata } from "$lib/metadata";
    import { OnshapeClient } from "$lib/onshape/client";
    import { page } from "$app/state";
    import { getOnshapeContext } from "./onshapeContext";
    import LinkOnshapeDocument from "./LinkOnshapeDocument.svelte";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { save } from "$lib/pocketbase";
    
    $effect(() => {
        $metadata.title = "Onshape Side Panel";
    });

    const config = getConfig();
    let onshape: OnshapeClient;
    $effect(() => {
        onshape = new OnshapeClient(
            config,
            page.url.searchParams.get("documentId") || "",
            page.url.searchParams.get("workspaceId") || page.url.searchParams.get("versionId") || "",
            page.url.searchParams.get("elementId") || ""
        );
        return () => {
            onshape?.dispose();
        };
    });

    const onshapeCtx = getOnshapeContext();
    const linkedProject = $derived(onshapeCtx.linkedProject);    
</script>

<h1>WIP Onshape panel</h1>

{#if linkedProject === null}
    <LinkOnshapeDocument />
    <button onclick={() => {
        save(Collections.OnshapeDocuments, { id: onshapeCtx.documentId }, { create: true });
    }}>Continue with no linked project</button>
{:else}
    <p>Linked to project: {linkedProject.title}</p>
{/if}

<style lang="scss">

</style>