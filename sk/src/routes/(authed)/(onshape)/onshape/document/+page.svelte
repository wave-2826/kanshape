<script lang="ts">
    import { getConfig } from "$lib/config";
    import { metadata } from "$lib/metadata";
    import { page } from "$app/state";
    import { queryOne, query, save } from "$lib/pocketbase";
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

    async function linkDocumentToProject(projectId: string, subprojectId?: string) {
        if(!documentId) return;

        await save(Collections.OnshapeDocuments, {
            id: documentId,
            project: projectId,
            subprojects: subprojectId || "",
        }, {
            create: true
        }).catch((e) => {
            console.error("Failed to save Onshape document record:", e);
        });

        window.location.reload();
    }
</script>

{#if record?.project}
    <p>Redirecting to project...</p>
{/if}
{#if !record?.project}
    {#if projects}
        {#each projects as project}
            <button onclick={async () => await linkDocumentToProject(project.id)}>Link to {project.title}</button>
            <p>Subprojects:</p>
            {#if project.subprojects}
                {#each projects as project}
                    {#each project.expand.subprojects as subproject}
                        <button onclick={async () => await linkDocumentToProject(project.id, subproject.id)}>Link to {subproject.name}</button>
                    {/each}
                {/each}
            {/if}
        {/each}
    {/if}
{/if}