<script lang="ts">
    import { page } from "$app/state";
    import { onshapeClient } from "$lib/onshape/requests";
    import { query, save } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { Kanban, SquareKanban } from "lucide-svelte";
    import { getOnshapeContext, LinkedProjectType } from "$lib/components/nav/onshapeContext.svelte";
    
    const documentId = page.url.searchParams.get("documentId");

    const projects = await query(Collections.Projects, { expand: "subprojects" });

    const onshapeCtx = getOnshapeContext();
    async function linkDocumentToProject(projectId: string, subprojectId?: string) {
        if(!documentId) return;

        const { data, error } = await onshapeClient.GET("/documents/{did}", {
            params: {
                path: { did: documentId }
            }
        });
        console.log("Fetched document details:", { data, error });

        if(!data) {
            console.error("Failed to fetch Onshape document details:", error);
            return;
        }

        const record = await save(Collections.OnshapeDocuments, {
            id: documentId,
            project: projectId,
            subproject: subprojectId || "",
            title: data.name ?? "Untitled Document"
        }, {
            expand: "project,subproject",
            create: onshapeCtx.linkedProject?.type === LinkedProjectType.Unregistered // Only create if not already registered, otherwise update
        }).catch((e) => {
            console.error("Failed to save Onshape document record:", e);
        });
        if(!record) return;

        onshapeCtx.linkedProject = {
            type: subprojectId ? LinkedProjectType.Subproject : LinkedProjectType.Project,
            ...record
        };
    }
</script>

<!-- TODO: This will need to scroll -->

<div class="list">
    {#if onshapeCtx.linkedProject?.type === LinkedProjectType.Unlinked}
        <p>This document is registered but not linked to a particular Onshape document. Link it to use the document tab.</p>
    {/if}
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

<style lang="scss">
.list {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1em;
    max-width: 400px;
}

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
</style>