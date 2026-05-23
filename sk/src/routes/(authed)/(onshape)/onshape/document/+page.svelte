<script lang="ts">
    import { getConfig } from "$lib/config";
    import { SquareKanban, Kanban } from "lucide-svelte";
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

<style lang="scss">
    dl {
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 0.5em;
    }
    dt {
        font-weight: bold;
    }
    h2 {
        margin-left: 0;
    }
    .center {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 1em;
    }
    .vert-center {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }
</style>



{#if record?.project}
    <p>Redirecting to project...</p>
{/if}
{#if !record?.project}
    {#if projects}
    <div class="vert-center">
    <div class="center">
    <div>
        <h2>Select a project or subproject to link to this document:</h2>
        <list>
        <dl>
        {#each projects as project}
            <dt><button style="color: {project.color}" onclick={async () => await linkDocumentToProject(project.id)}><SquareKanban /> Link to {project.title}</button></dt>
            {#if project.subprojects}
                    {#each project.expand.subprojects as subproject}
                            <dd><button onclick={async () => await linkDocumentToProject(project.id, subproject.id)}><Kanban /> Link to {subproject.name}</button></dd>
                    {/each}
            {/if}
        {/each}
        </dl>
        </list>
        </div>
        </div>
        </div>
    {/if}
{/if}