<script lang="ts">
    import { page } from "$app/state";
    import { untrack } from "svelte";
    import ProjectDetails, { type BoardCreationData } from "../../ProjectDetails.svelte";
    import { batch, CancelBatch, deleteRecord, query, queryOne, save } from "$lib/pocketbase";
    import { Collections, ProjectsTypeOptions, type BoardsRecord, type Create, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { metadata } from "$lib/metadata";
    import { ArrowLeft, Save, Trash } from "lucide-svelte";
    import { goto } from "$app/navigation";
    import { deepEqual } from "$lib/util";
    import { generateRecordID, type ProjectLinkedSite, type TypedProjectsResponse } from "$lib/data/project";
    
    $effect(() => {
        $metadata.title = project ? `${project.title} Settings` : "Project Settings";
    });
    
    const id = $derived(page.params.id);
    const projectExpand = "subprojects,boards,boards.sections";
    let project = $derived(id ? await untrack(() => queryOne(Collections.Projects, id, {
        expand: projectExpand
    }).catch((err) => {
        console.error("Failed to load project:", err);
        return null;
    })) : null);

    let originalSubprojects: SubprojectsRecord[] = $derived(project?.expand.subprojects ?? []);
    let originalBoards = $derived((project?.expand.boards ?? []) as (BoardsRecord & {
        expand: {
            sections: SectionsRecord[]
        }
    })[]);
    let originalSections = $derived.by(() => {
        if(!project) return [];
        const boards = project.expand.boards as (BoardsRecord & {
            expand: {
                sections: SectionsRecord[] | undefined
            }
        })[];
        return boards.flatMap(board => board.expand.sections).filter((s): s is SectionsRecord => s !== undefined);
    });

    let name: string = $state("");
    let description: string = $state("");
    let color: string | undefined = $state(undefined);
    let partIdPrefix: string = $state("");
    let type: ProjectsTypeOptions = $state("blank");
    let linkedSites: ProjectLinkedSite[] = $state([]);
    
    let subprojects: SubprojectsRecord[] = $state([]);
    let boards: BoardCreationData[] = $state([]);

    function boardCreationData(boards: (BoardsRecord & {
        expand: {
            sections: SectionsRecord[] | undefined
        }
    })[]): BoardCreationData[] {
        return boards.map(board => ({
            ...board,
            sections: board.expand.sections?.map(section => ({
                ...section
            })) ?? []
        }));
    }
    let originalBoardCreationData = $derived(boardCreationData(originalBoards));

    let changed = $derived.by(() => {
        if(!project) return false;
        return name !== project.title ||
            description !== project.description ||
            color !== project.color ||
            partIdPrefix !== project.part_id_prefix ||
            type !== project.type ||
            !deepEqual(subprojects, originalSubprojects) ||
            !deepEqual(boards, originalBoardCreationData) ||
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
            boards = boardCreationData((project.expand.boards ?? []) as (BoardsRecord & {
                expand: {
                    sections: SectionsRecord[]
                }
            })[]);
        }
    });

    async function saveChanges() {
        if(!project) return;

        const res = await batch(async (batch) => {
            if(!project) return;

            // Save changes to subprojects
            let subprojectIDs: string[] = [];
            for(let i = 0; i < subprojects.length; i++) {
                const subproject = subprojects[i];
                if(!subproject.id) {
                    // New subprojects
                    subproject.id = generateRecordID();
                    await save(Collections.Subprojects, subproject, { batch, create: true });
                } else if(!deepEqual(subproject, originalSubprojects.find(s => s.id === subproject.id))) {
                    // Changed subprojects
                    await save(Collections.Subprojects, subproject, { batch });
                }

                subprojectIDs.push(subproject.id);
            }
            // Deleted subprojects
            for(const subproject of originalSubprojects) {
                if(!subprojects.find(s => s.id === subproject.id)) {
                    // Check if any cards are associated with the subproject and warn
                    if((await query(Collections.Cards, {
                        filter: `subprojects ~ "${subproject.id}"`
                    })).length > 0) {
                        if(!confirm(`Subproject "${subproject.name}" has associated cards. Deleting it will remove it from every card. Are you sure you want to delete it?`)) {
                            throw new CancelBatch("User cancelled batch due to associated cards with subproject");
                        }
                    }

                    await deleteRecord(Collections.Subprojects, subproject.id, { batch });
                }
            }

            // Save changes to boards
            let boardIDs: string[] = [];
            for(let i = 0; i < boards.length; i++) {
                const board = boards[i];

                // Save changes to sections
                const sections = board.sections;
                let sectionIds = [];
                for(let i = 0; i < sections.length; i++) {
                    const section = sections[i];
                    if(!section.id) {
                        // New sections
                        const id = generateRecordID();
                        await save(Collections.Sections, { ...section, id }, { batch, create: true });
                        sectionIds.push(id);
                    } else if(!deepEqual(section, originalSections.find(s => s.id === section.id))) {
                        // Changed sections
                        await save(Collections.Sections, { ...section, id: section.id }, { batch });
                        sectionIds.push(section.id);
                    }
                }

                if(!board.id) {
                    // New boards
                    board.id = generateRecordID();
                    await save(Collections.Boards, {
                        ...board,
                        sections: sectionIds
                    }, { batch, create: true });
                } else if(!deepEqual(board, originalBoardCreationData.find(s => s.id === board.id))) {
                    // Technically could give a false positive but like whatever
                    // Changed boards
                    await save(Collections.Boards, {
                        ...board,
                        sections: sectionIds,
                        id: board.id // typescript moment
                    }, { batch });
                }

                boardIDs.push(board.id);
            }
            // Deleted boards
            for(const board of originalBoards) {
                if(!boards.find(s => s.id === board.id)) {
                    // Check if any cards are associated with the board and warn
                    if((await query(Collections.Cards, {
                        filter: `board = "${board.id}"`
                    })).length > 0) {
                        if(!confirm(`Board "${board.title}" has associated cards. Deleting it will delete every card on the board! Are you sure you want to delete it?`)) {
                            throw new CancelBatch("User cancelled batch due to associated cards with board");
                        }
                    }

                    await deleteRecord(Collections.Boards, board.id, { batch });
                    // Sections unfortunately aren't cascade deleted because we use a forward relation

                    for(const section of board.expand.sections) {
                        await deleteRecord(Collections.Sections, section.id, { batch });
                    }
                }
            }

            // Save changes to the project record
            await save(Collections.Projects, {
                id: project.id,
                title: name,
                description,
                color: color,
                part_id_prefix: partIdPrefix,
                subprojects: subprojectIDs,
                boards: boardIDs,
                linked_sites: linkedSites,
                type
            }, {
                create: false,
                batch
            });
        });

        if(res === null) return;

        // Reload the project to get the updated data
        project = await queryOne(Collections.Projects, project.id, {
            expand: projectExpand
        }).catch((err) => {
            console.error("Failed to reload project:", err);
            return null;
        });
    }

    async function deleteProject() {
        if(!project) return;
        if(!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

        // Because we use forward relations, we don't get cascade delete, so we have to manually delete all
        // subprojects, boards, and sections associated with the project. Cards will be automatically deleted
        // because they have a reverse relation to the project through the board and subproject.

        try {
            await batch(async (batch) => {
                if(!project) return;

                // Delete subprojects
                for(const subproject of (project.expand.subprojects ?? [])) {
                    await deleteRecord(Collections.Subprojects, subproject.id, { batch }).catch((err) => {
                        console.error(`Failed to delete subproject ${subproject.id}:`, err);
                    });
                }
                
                // Delete boards and their sections
                for(const board of (project.expand.boards ?? []) as (BoardsRecord & {
                    expand: {
                        sections: SectionsRecord[]
                    }
                })[]) {
                    for(const section of board.expand.sections) {
                        await deleteRecord(Collections.Sections, section.id, { batch }).catch((err) => {
                            console.error(`Failed to delete section ${section.id}:`, err);
                        });
                    }
                    await deleteRecord(Collections.Boards, board.id, { batch }).catch((err) => {
                        console.error(`Failed to delete board ${board.id}:`, err);
                    });
                }

                await deleteRecord(Collections.Projects, project.id, { batch });
            });

            goto("/");
        } catch(err) {
            console.error("Failed to delete project:", err);
            alert("Failed to fully delete project. Please try again.");
        }
    }
</script>

{#snippet backButton()}
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
{/snippet}

<div class="details">
    {@render backButton()}

    <ProjectDetails
        bind:name bind:description bind:color bind:partIdPrefix bind:type bind:subprojects bind:boards bind:linkedSites
        editedProject={project}
    />

    <div class="actions">
        {@render backButton()}
        <div style="flex: 1"></div>
        <button onclick={deleteProject} class="delete">
            <Trash />
            Delete project
        </button>
        <button onclick={saveChanges} class="save" disabled={!changed}>
            <Save />
            Save Changes
        </button>
    </div>
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

.actions {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 1rem;

    button {
        padding: 0.5rem 1rem;
        font-size: var(--font-medium);
    }
    
    .save {
        --bg-color: var(--bg-selection);
    }
    .delete {
        color: var(--error);
    }
}
</style>