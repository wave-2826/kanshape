<script lang="ts">
    import { SquareKanban, Kanban } from "lucide-svelte";
    import { metadata } from "$lib/metadata";
    import { page } from "$app/state";
    import { query, save, watchOne } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { goto } from "$app/navigation";

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
        
    const projects = await query(Collections.Projects, {expand: "subprojects"});

    async function linkDocumentToProject(projectId: string, subprojectId?: string) {
        if(!documentId) return;

        await save(Collections.OnshapeDocuments, {
            id: documentId,
            project: projectId,
            subproject: subprojectId || "",
        }, {
            create: true
        }).catch((e) => {
            console.error("Failed to save Onshape document record:", e);
        });
    }
</script>

{#if record?.project}
    <p>Redirecting to project...</p>
{/if}
{#if !record?.project && projects}
    <div class="container">
        <div class="center">
            <h2>Select a project or subproject to link to this document:</h2>
            <dl>
                {#each projects as project}
                    <dt>
                        <button
                            style="color: {project.color}"
                            onclick={() => linkDocumentToProject(project.id)}
                        >
                            <SquareKanban /> Link to {project.title}
                        </button>
                    </dt>
                    {#if project.subprojects}
                        {#each project.expand.subprojects as subproject}
                            <dd>
                                <button
                                    onclick={() => linkDocumentToProject(project.id, subproject.id)}
                                >
                                    <Kanban /> Link to {subproject.name}
                                </button>
                            </dd>
                        {/each}
                    {/if}
                {/each}
            </dl>
        </div>
    </div>
{/if}


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

    .container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }
    .center {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 1em;
    }
</style>