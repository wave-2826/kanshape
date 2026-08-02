<script lang="ts" module>
    import { generateRecordID, type OnshapeSelection } from "$lib/onshape/client";

    /**
     * Intermediate selection state for crating a new card on this page; can either be a client messaging
     * selection (e.g. from the live messaging updates onshape sends when the user clicks a part), "assembly"
     * (indicating the current assembly will be added), or null.
     */
    export type OnshapeNewCardSelectionState = OnshapeSelection | "assembly" | null;
</script>

<script lang="ts">
    import { page } from "$app/state";
    import NewCardView from "$lib/components/kanban/NewCardView.svelte";
    import { getOnshapeContext, LinkedProjectType } from "$lib/components/nav/onshapeContext.svelte";
    import CardPart from "$lib/components/parts/CardPart.svelte";
    import { getPartData, getSelectionCreationData, type CreationPart, type PartSelection } from "$lib/components/parts/partData";
    import PopoverButton from "$lib/components/PopoverButton.svelte";
    import type { PartExportType } from "$lib/data/parts";
    import { boardTypesConst } from "$lib/data/project";
    import { nav } from "$lib/navigation";
    import { save, watch, watchOne } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { deasyncify, formatDistance } from "$lib/util";
    import { ArrowLeft, ChevronDown, Factory, Kanban, Link, SquareKanban, TriangleAlert } from "lucide-svelte";
    import { untrack } from "svelte";
    import PartSelectButton from "./PartSelectButton.svelte";
    import { CREATE_SYMBOL, type MetadataFile } from "$lib/data/metadata";

    const onshapeCtx = getOnshapeContext();

    /** parse and validate the selection passed through query parameters */
    function parseSelection(part: string | null): OnshapeNewCardSelectionState {
        if(!part) return null;
        if(part === "assembly") return "assembly";
        try {
            const parsed = JSON.parse(part) as OnshapeSelection;
            if(!["BODY", "ENTITY", "OCCURRENCE"].includes(parsed.selectionType)) throw new Error(`Invalid selection type: ${parsed.selectionType}`);
            if(parsed.entityType && typeof parsed.entityType !== "string") throw new Error(`Invalid entity type: ${parsed.entityType}`);
            if(parsed.occurrencePath && !Array.isArray(parsed.occurrencePath)) throw new Error(`Invalid occurrence path: ${parsed.occurrencePath}`);
            if(parsed.occurrencePath && !parsed.occurrencePath?.every((p) => typeof p === "string")) throw new Error(`Invalid occurrence path: ${parsed.occurrencePath}`);
            if(!parsed.workspaceMicroversionId || typeof parsed.workspaceMicroversionId !== "string") throw new Error(`Invalid workspace microversion ID: ${parsed.workspaceMicroversionId}`);
            return parsed;
        } catch(e) {
            console.warn("Failed to parse selection: ", e);
            return null;
        }
    }
    let part = $state(parseSelection(page.url.searchParams.get("selection")));

    let partData = $state<(
        (CreationPart & { state: "loaded"}) |
        { state: "failed", message: string } |
        { state: "loading" | "no-part" }
    )>({ state: "no-part" });
    $effect(() => {
        (async () => {
            partData = { state: "loading" };
            try {
                if(part && part !== "assembly") {
                    const data = await getSelectionCreationData(onshapeCtx, part);
                    if(!data) {
                        partData = { state: "failed", message: "Failed to load part data" };
                        return;
                    }
                    partData = { ...data, state: "loaded" };
                    return;
                } else if(part === "assembly") {
                    if(!onshapeCtx.client || !onshapeCtx.documentId || !onshapeCtx.wvm || !onshapeCtx.wvmId || !onshapeCtx.elementId) {
                        throw new Error("Missing Onshape context for assembly selection");
                    }
                    const sel: PartSelection = {
                        documentId: onshapeCtx.documentId,
                        wvm: onshapeCtx.wvm,
                        wvmId: onshapeCtx.wvmId,
                        elementId: onshapeCtx.elementId,
                        type: "assembly",
                        configuration: "default" // again, we don't really get a configuration so who knows
                    };
                    const data = await getPartData(onshapeCtx.client, sel);
                    if(!data) {
                        partData = { state: "failed", message: "Failed to load assembly data" };
                        return;
                    }
                    partData = {
                        internalId: generateRecordID(),
                        state: "loaded",
                        type: "assembly",
                        sel,
                        partData: data
                    };
                    return;
                }
            } catch(e) {
                partData = { state: "failed", message: (e as Error).message ?? "Unknown error" };
                return;
            }
            console.log("no part or assembly specified");
            partData = { state: "no-part" };
        })();
    });
    
    const projects = await watch(Collections.Projects, {
        expand: "subprojects,boards"
    }, 1, 500).catch((err) => {
        console.error("Failed to load projects:", err);
        return null;
    });

    const linked = $derived(onshapeCtx.linkedProject);

    /** Checks if the given ID is of the currently linked project */
    function isLinked(projectId: string) {
        return (linked?.type === LinkedProjectType.Project || linked?.type === LinkedProjectType.Subproject) &&
            linked?.project === projectId;
    }
    function defaultSelected() {
        // if linked to a project, use its first parts board. if there are no parts boards, use the first board.
        if(linked?.type === LinkedProjectType.Project || linked?.type === LinkedProjectType.Subproject) {
            const linkedProject = $projects?.items.find(p => p.id === linked.project);
            if(linkedProject) {
                const partsBoard = linkedProject.expand.boards?.find(b => b.type === "parts");
                if(partsBoard) return { board: partsBoard.id, project: linkedProject.id };
                if(linkedProject.expand.boards && linkedProject.expand.boards.length > 0) return { board: linkedProject.expand.boards[0].id, project: linkedProject.id };
            }
        }
        return null;
    }

    let selectedBoard = $state<{ board: string, project: string } | null>(defaultSelected());
    const fullBoard = $derived(selectedBoard ? deasyncify(watchOne(Collections.Boards, selectedBoard.board, {
        expand: "sections"
    })) : null);
    const project = $derived(selectedBoard && $projects ? $projects.items.find(p => p.id === selectedBoard!.project) : null);
    const board = $derived(selectedBoard && project ? project.expand.boards?.find(b => b.id === selectedBoard!.board) : null);

    let newCardView: NewCardView | null = $state(null);
    let defaultTitle: string = "";
    $effect(() => {
        if(partData.state === "loaded" && newCardView && board) {
            untrack(() => {
                newCardView?.updateCard(c => {
                    if(partData.state !== "loaded") throw new Error("Part data is not loaded");

                    // don't overwrite title if user started changing it
                    if(c.title === defaultTitle) c.title = `Create ${partData.partData.name}`;

                    c.board = board.id;
                    c.section = board.sections?.[0] ?? "";

                    // TODO: This should be much more configurable
                    if(board.type === "parts") {
                        let creationSteps = [
                            ["3d_printer", `Create '${partData.partData.name}'`]
                        ];
                        const heuristic = "heuristic" in partData.partData ? partData.partData.heuristic : null;
                        const partType = heuristic?.partType ?? "";
                        if(partType === "shaft") creationSteps = [["bandsaw", `Cut '${partData.partData.name}'' to ${formatDistance(heuristic?.thickness ?? 0)}`]];
                        else if(partType === "plate") creationSteps = [["cnc_router", `Cut '${partData.partData.name}'`]]
                        else if(partType === "tube") creationSteps = [["lathe", `Cut ${
                            formatDistance(heuristic?.size[0] ?? 0, 1)
                        } x ${
                            formatDistance(heuristic?.size[1] ?? 0, 1)
                        } '${partData.partData.name}' to ${
                            formatDistance(heuristic?.thickness ?? 0)
                        }`]];

                        // TODO: bad for i18n, though it's not like we do that anyway...
                        let partFileName = partData.partData.name
                            .replace(/["]/g, "") // replace some characters with nothing
                            .replace(/[^a-zA-Z0-9_-]/g, "_") // replace invalid filename characters with underscores
                            .replace(/_+/g, "_"); // replace multiple underscores with a single underscore
                        if(partFileName.length > 30) partFileName = partFileName.substring(0, 30);

                        const autoExportTypes: PartExportType[] = [];
                        if(heuristic?.partType === "plate") autoExportTypes.push("dxf");
                        // todo: this would be nice but will eat through onshape api requests so...
                        // we should figure that out first
                        // else if(heuristic?.partType === "unknown") autoExportTypes.push("step");

                        const internalId = partData.internalId;
                        c.metadata = {
                            ...(c.metadata ?? {}),
                            "parts/onshape_part_id": {
                                type: {
                                    base: CREATE_SYMBOL,
                                    create: "onshape_part"
                                },
                                value: partData
                            },
                            "parts/steps": {
                                type: boardTypesConst.parts.fields.steps.type,
                                value: creationSteps
                            },
                            "parts/files": {
                                type: boardTypesConst.parts.fields.files.type,
                                value: autoExportTypes.map(t => ({
                                    id: CREATE_SYMBOL,
                                    name: `${partFileName}.${t}`,
                                    createType: "auto_export",
                                    forPart: { internalId: internalId },
                                    exportType: t
                                })) satisfies MetadataFile[]
                            }
                        };
                    }
                });
            });
        }
    });
</script>

<div class="page">
    <header>
        <button class="cancel" onclick={() => nav("/onshape")}>
            <ArrowLeft />
            Cancel
        </button>
        
        <div class="part">
            {#if part === "assembly"}
                Creating assembly card
            {:else if part}
                Creating part card
            {/if}
        </div>
    </header>
    
    <NewCardView
        bind:this={newCardView}
        board={$fullBoard ?? undefined}
        subprojects={project?.expand.subprojects ?? []}
        onopen={(card) => {
            defaultTitle = card.title;
            return card;
        }}
        oncreate={() => nav("/onshape")}
        buttonsClass={$css("card-buttons")}
        contentClass={$css("card-content")}
    >
        {#snippet header()}
            <div class="part-header">
                {#if board && board.type !== "parts"}
                    <span class="warning" title="This board is not a parts board. Parts and files will not be automatically linked.">
                        <TriangleAlert />
                    </span>
                {/if}
                {#if partData.state === "loaded"}
                    <CardPart bind:part={() => partData.state === "loaded" ? partData : null as never, p => {
                        if(partData.state !== "loaded") throw new Error("Part data is not loaded");
                        partData = { ...p, state: "loaded" };
                    }} />
                {:else if partData.state === "loading"}
                    <div class="placeholder-part">Loading part data...</div>
                {:else if partData.state === "failed"}
                    <div class="placeholder-part">Failed to load part data: {partData.message}</div>
                {:else if !(board && board.type !== "parts")}
                    <div class="placeholder-part">
                        No selected part
                        <PartSelectButton bind:part />
                    </div>
                {/if}
            </div>
        {/snippet}

        {#snippet buttons()}
            <Kanban />
            <PopoverButton
                class={$css("board-select-button")}
                contentClass={$css("board-select-popover")}
                style="color: {project?.color ?? "inherit"}"
            >
                {#if board}
                    <span class="board-name">{board.title}</span>
                {:else}
                    <span class="board-name">Select board...</span>
                {/if}
                <ChevronDown />

                {#snippet content({ close })}
                    {#if $projects}
                        <div class="project-list">
                            {#each $projects.items.sort((a, b) => {
                                // sort linked project first
                                if(isLinked(a.id) && !isLinked(b.id)) return -1;
                                if(!isLinked(a.id) && isLinked(b.id)) return 1;
                                return a.title?.localeCompare(b.title ?? "") ?? 0;
                            }) as project}
                                <div class="project" style="--project-color: {project.color ?? "inherit"}">
                                    <SquareKanban class={$css("icon")} /> <span class="name">{project.title}</span>
                                    {#if isLinked(project.id)}
                                        <Link />
                                    {/if}
                                </div>
                                {#each project.expand.boards?.sort((a, b) => {
                                    // sort parts boards first
                                    if(a.type === "parts" && b.type !== "parts") return -1;
                                    if(a.type !== "parts" && b.type === "parts") return 1;
                                    return a.title?.localeCompare(b.title ?? "") ?? 0;
                                }) as board}
                                    <button
                                        class="board"
                                        class:not-parts={board.type !== "parts"}
                                        class:selected={selectedBoard?.board === board.id}
                                        onclick={() => {
                                            selectedBoard = { board: board.id, project: project.id };
                                            newCardView?.updateCard((c) => {
                                                c.board = board.id;
                                                c.section = board.sections?.[0] ?? "";
                                                c.subprojects = c.subprojects.filter(sp => project.subprojects.includes(sp));
                                            });
                                            close();
                                        }}
                                        style="--project-color: {project.color ?? "inherit"}"
                                    >
                                        <Kanban class={$css("icon")} /> <span class="name">{board.title}</span>
                                        {#if board.type === "parts"}
                                            <span title="This is a parts board"><Factory class={$css("parts-board-icon")} /></span>
                                        {/if}
                                    </button>
                                {/each}
                            {/each}
                        </div>
                    {:else}
                        <p>Failed to load projects</p>
                    {/if}
                {/snippet}
            </PopoverButton>

            {#if board && board.type !== "parts"}
                <span class="warning" title="This board is not a parts board. Parts and files will not be automatically linked.">
                    <TriangleAlert />
                </span>
            {:else if !board}
                <span class="warning" title="Select a board before creating the card.">
                    <TriangleAlert />
                </span>
            {/if}
        {/snippet}
    </NewCardView>
</div>

<style lang="scss">
.page {
    display: flex;
    flex-direction: column;
    height: 100%;
}

header {
    display: flex;
    align-items: center;
    gap: 1rem;
    background-color: var(--bg-primary);
    padding: 0.5rem;
}

.board-select-popover {
    overflow-y: auto;
    overflow-x: hidden;
    max-height: 50%;
    padding: 0.5rem;
}
.project-list {
    display: flex;
    flex-direction: column;

    .icon {
        color: var(--project-color);
    }
    .project {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: var(--font-small);
        margin: 0.25rem 0;
        color: var(--project-color);

        &:not(:first-child) {
            margin-top: 0.5rem;
        }
    }
    .board {
        padding: 0.25rem 0.5rem 0.25rem 1rem;
        align-items: flex-start;

        &.not-parts {
            color: var(--text-secondary);
        }
        &.selected {
            --bg-color: var(--bg-secondary);
        }
    }
    .parts-board-icon {
        width: 1em;
        height: 1em;
    }
    .name {
        flex: 1;
        text-align: left;
        word-wrap: break-word;
        min-width: 0;
    }

    button {
        --bg-color: transparent;
    }
}

.card-content {
    padding: 0.75rem;
}
.card-buttons {
    background-color: var(--bg-primary);
    padding: 0.5rem;
    align-items: center;

    .board-select-button {
        overflow: hidden;
        flex: 1;
        
        .board-name {
            flex: 1;
            min-width: 0;
            text-align: left;

            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
    }
}

.part-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;

    .placeholder-part {
        width: 100%;
        padding: 0.5rem;
        border-radius: 4px;
        background-color: var(--bg-primary);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
}

.warning {
    color: var(--warning-medium);
}
</style>