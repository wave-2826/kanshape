<script lang="ts">
    import { page } from "$app/state";
    import { onshapeClient } from "$lib/onshape/requests";
    import { query, save } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { Kanban, SquareKanban } from "lucide-svelte";
    
    const documentId = page.url.searchParams.get("documentId");

    const projects = await query(Collections.Projects, { expand: "subprojects" });

    async function linkDocumentToProject(projectId: string, subprojectId?: string) {
        if(!documentId) return;

        const { data, error } = await onshapeClient.GET("/documents/{did}", {
            params: {
                path: { did: documentId }
            }
        });

        if(!data) {
            console.error("Failed to fetch Onshape document details:", error);
            return;
        }

        await save(Collections.OnshapeDocuments, {
            id: documentId,
            project: projectId,
            subproject: subprojectId || "",
            title: data.name || "Untitled Document"
        }, {
            create: true
        }).catch((e) => {
            console.error("Failed to save Onshape document record:", e);
        });
    }
</script>

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
</div>

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

.list {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1em;
}
</style>