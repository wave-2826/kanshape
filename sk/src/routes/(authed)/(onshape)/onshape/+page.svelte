<script lang="ts">
    import { getConfig } from "$lib/config";
    import { metadata } from "$lib/metadata";
    import { OnshapeClient } from "$lib/onshape/client";
    import { page } from "$app/state";
    import { onshapeApiRequest } from "$lib/onshape/requests";

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

    const req = onshapeApiRequest(config, "GET", "/api/v16/metadata/d/27513eb20fd7a7d9e3043aa2/w/f122e4cc32f851f888ad6e1b/e");
</script>

<h1>Onshape panel</h1>

{#await req}
    <p>Loading...</p>
{:then data}
    <p style="font-size: 12px">Data: {JSON.stringify({
        ...data,
        body: ""
    }, null, 4)}</p>
{:catch error}
    <p>Error: {error.message}</p>
{/await}