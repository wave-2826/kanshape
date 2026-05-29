<script lang="ts">
    import { metadata } from "$lib/metadata";
    import { batch, save } from "$lib/pocketbase";
    import { Collections, ProjectsTypeOptions, type Create } from "$lib/pocketbase/generated-types";
    import { Plus } from "lucide-svelte";
    import { generateRecordID, getTemplateSections, type ProjectLinkedSite } from "$lib/data/project";
    import type { BoardCreationData } from "$lib/components/projects/ProjectDetails.svelte";
    import ProjectDetails from "$lib/components/projects/ProjectDetails.svelte";

    $effect(() => {
        $metadata.title = "New project";
    });

    let name = $state("");
    let description = $state("");
    let color = $state<string | undefined>(undefined);
    let partIdPrefix = $state(new Date().getFullYear().toString());
    let type = $state<ProjectsTypeOptions>("blank");
    let linkedSites = $state<ProjectLinkedSite[]>([]);
    
    let subprojects = $state<Create<"subprojects">[]>([]);
    let boards = $state<BoardCreationData[]>([
        { title: "Default", description: "", type: "blank", sections: getTemplateSections() }
    ]);

    async function createProject() {
        const result = await batch(async (batch) => {
            for(const board of boards) {
                let sectionIds: string[] = [];
                for(const [sectionIndex, section] of board.sections.entries()) {
                    const id = generateRecordID();
                    sectionIds.push(id);
                    save(Collections.Sections, {
                        ...section,
                        position: sectionIndex * 10000 + Math.random() * 100,
                        id
                    }, { batch, create: true });
                }

                save(Collections.Boards, {
                    title: board.title,
                    description: board.description,
                    type: board.type,
                    sections: sectionIds
                }, { batch, create: true });
            }
            
            for(const subproject of subprojects) {
                save(Collections.Subprojects, subproject, { batch, create: true });
            }
        });
        if(!result) return;

        let boardIds = result.filter(r => r.body.collectionName === Collections.Boards).map(r => r.body.id);
        let subprojectIds = result.filter(r => r.body.collectionName === Collections.Subprojects).map(r => r.body.id);

        if(boardIds.length !== boards.length || subprojectIds.length !== subprojects.length) {
            alert("Failed to create all boards or subprojects");
            return;
        }

        // Sadly, PB doesn't support transactions, so we have to do this across multiple requests.
        const projectRecord = await save(Collections.Projects, {
            title: name,
            description,
            part_id_prefix: partIdPrefix,
            current_part_id: 1,
            color: color ?? "",
            boards: boardIds,
            subprojects: subprojectIds,
            linked_sites: linkedSites,
            type: "blank"
        }, {
            create: true
        });

        // Redirect to the new project page
        window.location.href = `/projects/${projectRecord.id}`;
    }
</script>

<div class="layout">
    <h1>New project</h1>

    <div class="options">
        <ProjectDetails bind:name bind:description bind:color bind:partIdPrefix bind:type bind:subprojects bind:boards bind:linkedSites />

        <button onclick={createProject} disabled={name.trim().length === 0 || partIdPrefix.trim().length === 0} class="create">
            <Plus />Create {name}
        </button>
    </div>
</div>

<style lang="scss">
.layout {
    overflow: auto;
    max-height: 100%;
    padding: 1rem;
}
h1 {
    margin-bottom: 1rem;
}

.options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 10rem;
}
.create {
    padding: 0.5rem 1rem;
    font-size: var(--font-medium);
    --bg-color: var(--bg-selection);
}
</style>