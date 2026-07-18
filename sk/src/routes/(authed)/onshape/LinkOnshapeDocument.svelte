<script lang="ts">
    import { query, save } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { Kanban, SquareKanban } from "lucide-svelte";
    import { getOnshapeContext, LinkedProjectType } from "$lib/components/nav/onshapeContext.svelte";

    const { allowUnlinked = false }: {
        allowUnlinked?: boolean
    } = $props();

    const projects = await query(Collections.Projects, { expand: "subprojects" });

    const onshapeCtx = getOnshapeContext();
    async function linkDocumentToProject(projectId: string, subprojectId?: string) {
        if(!onshapeCtx.documentId || !onshapeCtx.client) return;

        const { data, error } = await onshapeCtx.client.requests.GET("/documents/{did}", {
            params: {
                path: { did: onshapeCtx.documentId }
            }
        });
        console.log("Fetched document details:", { data, error });

        if(!data) {
            console.error("Failed to fetch Onshape document details:", error);
            return;
        }

        const record = await save(Collections.OnshapeDocuments, {
            id: onshapeCtx.documentId,
            workspace_id: onshapeCtx.wvmId ?? "",
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

    async function saveUnlinked() {
        const record = await save(Collections.OnshapeDocuments, {
            id: onshapeCtx.documentId ?? "",
            workspace_id: onshapeCtx.wvmId ?? ""
        }, { create: true, expand: "project,subproject" });
        if(!record) return;

        onshapeCtx.linkedProject = {
            type: LinkedProjectType.Unlinked,
            ...record
        };
    }
</script>

<!-- TODO: This will need to scroll -->

<div class="list">
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
    {#if allowUnlinked}
        <button onclick={() => saveUnlinked()}>Continue with no linked project</button>
    {/if}
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
    margin: 0;
}
dt {
    font-weight: bold;
}
h2 {
    margin-left: 0;
}
</style>