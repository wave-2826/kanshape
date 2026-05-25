<script lang="ts">
    import { page } from "$app/state";
    import { untrack } from "svelte";
    import ProjectDetails from "../../ProjectDetails.svelte";
    import { deleteRecord, queryOne, save } from "$lib/pocketbase";
    import { Collections, ProjectsTypeOptions, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { metadata } from "$lib/metadata";
    import { ArrowLeft, Save } from "lucide-svelte";
    import { goto } from "$app/navigation";
    import { deepEqual } from "$lib/util";
    import type { ProjectLinkedSite, TypedProjectsResponse } from "$lib/project";
    
    $effect(() => {
        $metadata.title = project ? `${project.title} Settings` : "Project Settings";
    });
    
    const id = $derived(page.params.id);
    let project = $derived(id ? await untrack(() => queryOne(Collections.Projects, id, {
        expand: "subprojects,sections"
    }).catch((err) => {
        console.error("Failed to load project:", err);
        return null;
    })) : null);

    let originalSubprojects: SubprojectsRecord[] = $derived(project?.expand.subprojects ?? []);
    let originalSections: SectionsRecord[] = $derived(project?.expand.sections ?? []);

    let name: string = $state("");
    let description: string = $state("");
    let color: string | undefined = $state(undefined);
    let partIdPrefix: string = $state("");
    let type: ProjectsTypeOptions = $state("blank");
    let linkedSites: ProjectLinkedSite[] = $state([]);
    
    let subprojects: SubprojectsRecord[] = $state([]);
    let sections: SectionsRecord[] = $state([]);

    let changed = $derived.by(() => {
        if(!project) return false;
        return name !== project.title ||
            description !== project.description ||
            color !== project.color ||
            partIdPrefix !== project.part_id_prefix ||
            type !== project.type ||
            !deepEqual(subprojects, originalSubprojects) ||
            !deepEqual(sections, originalSections) ||
            !deepEqual(linkedSites, project.linked_sites ?? []);
    });

    $effect(() => {
        if(project) {
            const p = project as TypedProjectsResponse;
            name = p.title;
            description = p.description;
            color = p.color;
            partIdPrefix = p.part_id_prefix;
            type = p.type;
            linkedSites = p.linked_sites ?? [];
            subprojects = project.expand.subprojects ?? [];
            sections = project.expand.sections ?? [];
        }
    });

    async function saveChanges() {
        if(!project) return;

        // Save changes to the subprojects

        // New subprojects
        for(let i = 0; i < subprojects.length; i++) {
            const subproject = subprojects[i];
            if(!subproject.id) subprojects[i] = await save(Collections.Subprojects, subproject, { create: true });
        }
        // Changed subprojects
        for(const subproject of subprojects) {
            if(subproject.id && !deepEqual(subproject, originalSubprojects.find(s => s.id === subproject.id))) {
                await save(Collections.Subprojects, subproject, { create: false });
            }
        }
        // Deleted subprojects
        for(const subproject of originalSubprojects) {
            if(!subprojects.find(s => s.id === subproject.id)) {
                await deleteRecord(Collections.Subprojects, subproject.id);
            }
        }

        // Save changes to the sections
        
        // New sections
        for(let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if(!section.id) sections[i] = await save(Collections.Sections, section, { create: true });
        }
        // Changed sections
        for(const section of sections) {
            if(section.id && !deepEqual(section, originalSections.find(s => s.id === section.id))) {
                await save(Collections.Sections, section, { create: false });
            }
        }
        // Deleted sections
        for(const section of originalSections) {
            if(!sections.find(s => s.id === section.id)) {
                await deleteRecord(Collections.Sections, section.id);
            }
        }

        // Save changes to the project record
        await save(Collections.Projects, {
            id: project.id,
            title: name,
            description,
            color: color,
            part_id_prefix: partIdPrefix,
            sections: sections.map(s => s.id),
            subprojects: subprojects.map(s => s.id),
            linked_sites: linkedSites,
            type
        }, {
            create: false
        });

        // Reload the project to get the updated data
        project = await queryOne(Collections.Projects, project.id, {
            expand: "subprojects,sections"
        }).catch((err) => {
            console.error("Failed to reload project:", err);
            return null;
        });
    }
</script>

<div class="details">
    <button onclick={() => {
        if(changed) {
            if(!confirm("You have unsaved changes. Are you sure you want to leave?")) return;
        }
        goto(`/projects/${id}`);
    }} class="back">
        <ArrowLeft />
        Back to project
        {#if changed}
            <span class="unsaved-warning">Unsaved changes</span>
        {/if}
    </button>
    <ProjectDetails
        bind:name bind:description bind:color bind:partIdPrefix bind:type bind:subprojects bind:sections bind:linkedSites
        editedProject={project}
    />
    <button onclick={saveChanges} class="save" disabled={!changed}>
        <Save />
        Save Changes
    </button>
</div>

<style lang="scss">
.back {
    align-self: flex-start;

    .unsaved-warning {
        color: var(--error);
        font-size: var(--font-small);
        margin-left: 0.5rem;
    }
}
.details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    overflow-y: auto;
    height: 100%;
    padding-bottom: 10rem;
}
.save {
    align-self: flex-end;
    padding: 0.5rem 1rem;
    font-size: var(--font-medium);
    --bg-color: var(--bg-selection);
}
</style>