<script lang="ts">
    import { page } from "$app/state";
    import { untrack } from "svelte";
    import { batch, CancelBatch, deleteRecord, query, queryOne, save } from "$lib/pocketbase";
    import { Collections, ProjectsTypeOptions, type BoardsRecord, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { metadata } from "$lib/metadata";
    import { ArrowLeft, Save, Trash } from "lucide-svelte";
    import { goto } from "$app/navigation";
    import { deepEqual } from "$lib/util";
    import { generateRecordID, type ProjectLinkedSite, type TypedProjectsResponse } from "$lib/data/project";
    import ProjectDetails from "$lib/components/projects/ProjectDetails.svelte";
    import { boardCreationData, deleteBoard, saveBoardRecords, type BoardCreationData } from "$lib/components/projects/BoardSettings.svelte";
    import SettingsPage from "../SettingsPage.svelte";
    import { deleteSubproject } from "$lib/components/projects/SubprojectSettings.svelte";
    
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

    let name: string = $state("");
    let description: string = $state("");
    let color: string | undefined = $state(undefined);
    let partIdPrefix: string = $state("");
    let type: ProjectsTypeOptions = $state("blank");
    let linkedSites: ProjectLinkedSite[] = $state([]);
    
    let subprojects: SubprojectsRecord[] = $state([]);
    let boards: BoardCreationData[] = $state([]);

    let originalBoardCreationData = $derived(originalBoards.map(boardCreationData));

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
            boards = ((project.expand.boards ?? []) as (BoardsRecord & {
                expand: {
                    sections: SectionsRecord[]
                }
            })[]).map(boardCreationData);
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
                if(!subprojects.find(s => s.id === subproject.id)) await deleteSubproject(subproject, batch);
            }

            // Save changes to boards
            let boardIDs: string[] = [];
            for(let i = 0; i < boards.length; i++) {
                const board = boards[i];
                const originalBoard = originalBoardCreationData.find(s => s.id === board.id);

                boardIDs.push(await saveBoardRecords(board, originalBoard, batch));
            }
            // Deleted boards
            for(const board of originalBoards) {
                if(!boards.find(s => s.id === board.id)) await deleteBoard(board, batch);
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

                // We don't use the dedicated deletion functions here because the user already confirmed
                // they want all associated data gone; we don't need to ask for every board, subproject,
                // etc.

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

<SettingsPage
    returnPath={`/projects/${project?.id ?? ""}`}
    settingsType="project"
    {changed}
    onsave={saveChanges}
    ondelete={deleteProject}
>
    <ProjectDetails
        bind:name bind:description bind:color bind:partIdPrefix bind:type bind:subprojects bind:boards bind:linkedSites
        editedProject={project}
    />
</SettingsPage>