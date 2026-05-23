<script lang="ts">
    import { getConfig } from "$lib/config";
    import { metadata } from "$lib/metadata";
    import { page } from "$app/state";
    import { queryOne, query, cannonicalizeExpand } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";


    $effect(() => {
        $metadata.title = "Onshape Tab";
    });

    const documentId = page.url.searchParams.get("documentId");

    const record = await queryOne(Collections.OnshapeDocuments, documentId || "").catch(() => null);


    const redirectUrl = record?.subprojects ? "/projects/" + record?.project + "/subprojects/" + record?.subprojects + "?onshape=true" : "/projects/" + record?.project + "?onshape=true";

    console.log("Redirecting to project: " + redirectUrl);

    if(record?.project) {
        window.location.href = redirectUrl;
    }

    const projects = await query(Collections.Projects, {expand: "subprojects"});
</script>

{#if record?.project}
    <p>Redirecting to project...</p>
{/if}
{#if !record?.project}
    {#if projects}
        {#each projects as project}
            <p>Project: {project.title} (ID: {project.id})</p>
            <p>Subprojects:</p>
            {#if project.subprojects}
                {#each projects as project}
                    {#each project.expand.subprojects as subproject}
                        <p> - {subproject.name} (ID: {subproject.id})</p>
                    
                    {/each}
                {/each}
            {/if}
        {/each}
    {/if}
{/if}