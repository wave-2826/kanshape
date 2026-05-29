<script lang="ts">
    import { metadata } from "$lib/metadata";
    import { page } from "$app/state";
    import { watchOne } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { goto } from "$app/navigation";
    import LinkOnshapeDocument from "$lib/components/LinkOnshapeDocument.svelte";

    $effect(() => {
        $metadata.title = "Onshape Tab";
    });

    const documentId = page.url.searchParams.get("documentId");

    const watchRecord = await watchOne(Collections.OnshapeDocuments, documentId || "").catch(() => null);
    const record = $watchRecord;
    
    function redirect() {
        goto(record?.subproject ?
            `/projects/${record?.project}/subprojects/${record?.subproject}?onshape=true` :
            `/projects/${record?.project}?onshape=true`);
    }
    $effect(() => {
        if(record?.project) redirect();
    });
</script>

{#if record?.project}
    <p>Redirecting to project...</p>
{/if}
{#if !record?.project}
    <div class="container">
        <LinkOnshapeDocument />
    </div>
{/if}


<style lang="scss">
.container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}
</style>