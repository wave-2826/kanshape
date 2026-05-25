<script lang="ts">
    import { metadata } from "$lib/metadata";
    import { batch, save } from "$lib/pocketbase";
    import { Collections, ProjectsTypeOptions, type Create } from "$lib/pocketbase/generated-types";
    import { Plus } from "lucide-svelte";
    import ProjectDetails from "../ProjectDetails.svelte";
    import type { ProjectLinkedSite } from "$lib/project";

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
    let sections = $state<Create<"sections">[]>([
        { title: "To Design", description: "Items that still need to be designed in CAD", color: undefined, is_completed: false },
        { title: "Being Designed", description: "Items currently being worked on in CAD", color: "#fdcb6e", is_completed: false },
        { title: "To Manufacture", description: "Items ready for manufacturing", color: "#00b894", is_completed: false },
        { title: "Completed", description: "Items that have been completed", color: "#0984e3", is_completed: true }
    ]);

    async function createProject() {
        const result = await batch(async (batch) => {
            for(const [i, section] of sections.entries()) {
                save(Collections.Sections, {
                    ...section,
                    position: i * 10000 + Math.random() * 1000
                }, { batch, create: true });
            }
            
            for(const subproject of subprojects) {
                save(Collections.Subprojects, subproject, { batch, create: true });
            }
        });

        let sectionIds = result.filter(r => r.body.collectionName === Collections.Sections).map(r => r.body.id);
        let subprojectIds = result.filter(r => r.body.collectionName === Collections.Subprojects).map(r => r.body.id);

        // Sadly, PB doesn't support transactions, so we have to do this across multiple requests.
        const projectRecord = await save(Collections.Projects, {
            title: name,
            description,
            part_id_prefix: partIdPrefix,
            current_part_id: 1,
            color: color ?? "",
            sections: sectionIds,
            subprojects: subprojectIds,
            custom_card_fields: {},
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
        <ProjectDetails bind:name bind:description bind:color bind:partIdPrefix bind:type bind:subprojects bind:sections bind:linkedSites />

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