<script lang="ts" module>
    import { type FilterNode } from "./filter";

    export type FilterViewState = {
        description: boolean,
        board: boolean,
        due: boolean,
        assignment: boolean,
        priority: boolean,
        subprojects: boolean,
        section: boolean
    };

    export type FilterQuickState = {
        priorities: string[],
        due: string,
        users: { id: string, name: string }[],
        groups: { id: string, name: string }[],
        subprojects: { id: string, name: string }[],
        boards: { id: string, name: string }[],
        sections: { id: string, name: string }[]
    };

    export type FilterState = {
        filterString?: string,
        filter?: FilterNode,
        view: FilterViewState,
        quick: FilterQuickState,
        /**
         * This is a weird type because it's a function that _creates_ a matcher for cards.
         * We do this to allow silly things like caching matched cards.
         */
        match?: () => (card: TypedCardPreviewResponse) => boolean
    };

    export const defaultFilterState: FilterState = {
        filter: undefined,
        match: undefined,
        view: {
            description: true,
            board: true,
            due: true,
            assignment: true,
            priority: true,
            subprojects: true,
            section: true
        },
        quick: {
            priorities: [],
            due: "",
            users: [],
            groups: [],
            subprojects: [],
            boards: [],
            sections: []
        }
    };
</script>

<script lang="ts">
    import { Clock, Flag, Funnel, Kanban, RotateCcw, SquarePlus, Tag, TextInitial, Users, View } from "lucide-svelte";
    import NewCardModal from "../NewCardModal.svelte";
    import type { ExpandResponse } from "$lib/pocketbase";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import type { TypedBoardsResponse } from "$lib/data/project";
    import PopoverButton from "../../PopoverButton.svelte";
    import FilterMenu from "./FilterMenu.svelte";

    const viewLabels: Record<keyof FilterViewState, string> = {
        description: "Description",
        board: "Board",
        due: "Due Date",
        assignment: "Assignment",
        priority: "Priority",
        subprojects: "Subprojects",
        section: "Section"
    };

    let {
        project,
        board,
        cards,
        filterState = $bindable(),
        hiddenViewCategories = []
    }: {
        project: ExpandResponse<"projects", "subprojects,boards">,
        board?: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        cards?: TypedCardPreviewResponse[],
        filterState: FilterState,
        /** 
         * Categories to hide from the view menu. e.g. the kanban board view doesn't show sections anyway, so
         * we can hide that option from the view menu.
         */
        hiddenViewCategories?: (keyof FilterViewState)[]
    } = $props();

    let newCardModal: NewCardModal | null = $state(null);

    const sections = $derived(board?.expand.sections ?? []);

    export function openNewCardModal(defaultSectionId?: string) {
        newCardModal?.open(defaultSectionId);
    }

    const hiddenViewItems = $derived(Object.values(filterState.view).filter(v => !v).length);
    // svelte doesn't like these inline for some reason
    const viewButtonClass = $derived(hiddenViewItems > 0 ? "selected" : "");
    const filterButtonClass = $derived(filterState.filter !== undefined ? "selected" : "");
</script>

<menu>
    {#if sections && sections.length > 0}
        <button onclick={() => newCardModal?.open()} class="new">
            <SquarePlus /> New Card
        </button>
    {/if}
    <PopoverButton class={filterButtonClass}>
        <Funnel /> Filter
        {#if filterState.filter}
            <span class="indicator">+</span>
        {/if}
        {#snippet content()}
            <FilterMenu bind:filterState={filterState} {project} {board} {hiddenViewCategories} />
        {/snippet}
    </PopoverButton>
    <PopoverButton class={viewButtonClass}>
        <View /> View
        {#if hiddenViewItems > 0}
            <span class="indicator">-{hiddenViewItems}</span>
        {/if}
        {#snippet content()}
            <div class="view-items">
                <button
                    onclick={() => {
                        filterState.view = Object.fromEntries(Object.keys(filterState.view).map((key) => [key, true])) as FilterViewState;
                    }}
                    disabled={hiddenViewItems === 0}
                ><RotateCcw class={$css("reset-icon")} /> Reset</button>
                {#each (Object.entries(viewLabels) as [keyof FilterViewState, string][]) as [key, label]}
                    {#if !hiddenViewCategories.includes(key as keyof FilterViewState)}
                        <label>
                            <input type="checkbox" bind:checked={filterState.view[key]} />
                            {#if key === "description"}<TextInitial />
                            {:else if key === "assignment"}<Users />
                            {:else if key === "board"}<Kanban />
                            {:else if key === "section"}<Kanban />
                            {:else if key === "due"}<Clock />
                            {:else if key === "priority"}<Flag />
                            {:else if key === "subprojects"}<Tag />
                            {/if}
                            {label}
                        </label>
                    {/if}
                {/each}
            </div>
        {/snippet}
    </PopoverButton>
    <input type="text" placeholder="Search cards..." disabled />
</menu>

{#if board && sections && cards}
    <NewCardModal
        bind:this={newCardModal}
        subprojects={project.expand.subprojects ?? []}
        boardCards={cards} {board}
    />
{/if}

<style lang="scss">
menu {
    background-color: var(--bg-primary);
    padding: 0.25rem;
    border-radius: 4px;
    margin: 0 0.5rem;

    display: flex;
    flex-direction: row;
    gap: 0.5rem;

    white-space: nowrap;
    overflow-x: auto;
    flex-shrink: 0;

    input {
        padding: 0 0.5rem;
        width: 200px;
    }
}

.view-items {
    font-size: var(--font-small);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .reset-icon {
        width: 1em;
        height: 1em;
    }
}

.indicator {
    font-size: var(--font-small);
    color: var(--accent);
    margin: 0 0.25em;
}
</style>