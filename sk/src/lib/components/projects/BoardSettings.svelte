<script lang="ts" module>
    import { Collections, type BoardsRecord, type Create, type RecordIdString, type SectionsRecord } from "$lib/pocketbase/generated-types";

    export type BoardCreationData = Omit<Create<"boards">, "sections"> & {
        sections: Create<"sections">[]
    };

    export function boardCreationData(boards: (BoardsRecord & {
        expand: {
            sections: SectionsRecord[] | undefined
        }
    })): BoardCreationData {
        return {
            ...boards,
            sections: boards.expand.sections?.map(section => ({
                ...section
            })) ?? []
        };
    }

    /**
     * Save changes to or new records related to the board settings.  
     * @returns the board ID, which may be newly generated if the board is new.
     */
    export async function saveBoardRecords(
        board: BoardCreationData,
        originalBoard?: BoardCreationData | null,
        batch?: BatchService
    ): Promise<RecordIdString> {
        // Save changes to sections
        const sections = board.sections;
        let sectionIds = [];
        for(let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if(!board.id || !section.id) {
                // New sections
                section.id = generateRecordID();
                await save(Collections.Sections, section, { batch, create: true });
            } else if(!deepEqual(section, originalBoard?.sections.find(s => s.id === section.id))) {
                // Changed sections
                await save(Collections.Sections, { ...section, id: section.id }, { batch });
            }

            sectionIds.push(section.id);
        }
        
        if(!board.id) {
            // New boards
            board.id = generateRecordID();
            await save(Collections.Boards, {
                ...board,
                sections: sectionIds
            }, { batch, create: true });
        } else if(
            // Technically could give a false positive if only section data changes but whatever
            !deepEqual(board, originalBoard)
        ) {
            // Changed boards
            await save(Collections.Boards, {
                ...board,
                sections: sectionIds,
                id: board.id // typescript moment
            }, { batch });
        }

        return board.id;
    }

    /**
     * Attempts to delete the board given by the passed record, but warns if there is still data associated
     * with it.
     */
    export async function deleteBoard(board: ExpandRecord<"boards", "sections">, batch?: BatchService) {
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

        for(const section of board.expand.sections!) {
            await deleteRecord(Collections.Sections, section.id, { batch });
        }
    }
</script>

<script lang="ts">
    import { boardTypes, generateRecordID, type ProjectLinkedSite } from "$lib/data/project";
    import { BoardsTypeOptions } from "$lib/pocketbase/generated-types";
    import LeftPaneChooser from "../LeftPaneChooser.svelte";
    import LinkedSiteDetails from "./LinkedSiteDetails.svelte";
    import type { BatchService } from "pocketbase";
    import { CancelBatch, deleteRecord, query, save, type ExpandRecord, type ExpandResponse } from "$lib/pocketbase";
    import { deepEqual } from "$lib/util";

    const {
        board = $bindable(),
        panelBackgrounds
    }: {
        board: BoardCreationData,
        panelBackgrounds?: string
    } = $props();
</script>

<div class="board">
    <input type="text" placeholder="Board name" bind:value={board.title} />
    <textarea placeholder="Board description (optional)" bind:value={board.description}></textarea>

    <h2>Board type</h2>
    <div class="type-selector">
        {#each (Object.keys(BoardsTypeOptions) as BoardsTypeOptions[]) as option}
            {@const optionDetails = boardTypes[option]}
            <button class:selected={board.type === option} onclick={() => board.type = option}>
                {optionDetails.name}
                <span class="description">{optionDetails.description}</span>
            </button>
        {/each}
    </div>

    <h2>Sections</h2>
    <LeftPaneChooser
        options={board.sections?.map(s => ({ name: s.title ?? "", tooltip: s.description, color: s.color })) ?? []}
        oncreate={() => {
            if(!board.sections) board.sections = [];
            board.sections.push({ title: `Section ${board.sections.length + 1}`, description: "", color: undefined, is_completed: false });
        }}
        ondelete={(option) => board.sections?.splice(option, 1)}
        ordered
        onreorder={(from, to) => {
            if(!board.sections) return;
            const selArr = board.sections.map((_, i) => i);
            const selItem = selArr.splice(from, 1)[0];
            selArr.splice(to, 0, selItem);
            board.sections = selArr.map(i => board.sections![i]);
        }}
        background={panelBackgrounds}
    >
        {#snippet pane(selected)}
            {@const section = board.sections?.[selected]}
            {#if section}
                {@const hasColor = section.color !== undefined && section.color.trim() !== ""}
                <div class="section">
                    <input type="text" placeholder="Section name" bind:value={section.title} />
                    <textarea placeholder="Section description (optional)" bind:value={section.description}></textarea>

                    <div class="option">
                        <label for="sectionColor">Section color</label>
                        <input
                            type="color"
                            id="sectionColor"
                            value={section.color ?? "#ffffff"}
                            onchange={(e) => section.color = e.currentTarget.value}
                            class:selected={hasColor}
                        />
                        <button onclick={() => section.color = ""} class:selected={!hasColor}>None</button>
                    </div>
                    <div class="option">
                        <label for="isCompleted">Is completed?</label>
                        <input
                            type="checkbox"
                            id="isCompleted"
                            checked={section.is_completed}
                            onchange={(e) => section.is_completed = e.currentTarget.checked}
                        />
                    </div>
                </div>
            {/if}
        {/snippet}
    </LeftPaneChooser>

    <h2>Linked sites</h2>
    <LinkedSiteDetails bind:linkedSites={board.linked_sites as ProjectLinkedSite[]} background={panelBackgrounds} />
</div>

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "settings.scss";

.board, .section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>