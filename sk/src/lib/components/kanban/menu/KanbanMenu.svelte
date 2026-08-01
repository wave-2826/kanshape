<script lang="ts" module>
    import { type FilterNode, matchFilter, parseFilterString } from "./filter";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import { browser } from "$app/environment";

    export type FilterViewState = {
        description: boolean,
        board: boolean,
        due: boolean,
        assignment: boolean,
        priority: boolean,
        subprojects: boolean,
        section: boolean
    };

    const defaultView: FilterViewState = {
        description: true,
        board: true,
        due: true,
        assignment: true,
        priority: true,
        subprojects: true,
        section: true
    };

    const VIEW_STORAGE_PREFIX = "kanban_filter_view";

    /**
     * different views (e.g. board vs list) hide different categories, so we keep a separate saved
     * view per set of hidden categories.
     */
    function viewStorageKey(hiddenCategories: readonly (keyof FilterViewState)[]): string {
        const suffix = [...hiddenCategories].sort().join(",");
        return suffix ? `${VIEW_STORAGE_PREFIX}:${suffix}` : VIEW_STORAGE_PREFIX;
    }

    export function loadFilterView(hiddenCategories: readonly (keyof FilterViewState)[] = []): FilterViewState {
        if(!browser) return { ...defaultView };
        try {
            const raw = localStorage.getItem(viewStorageKey(hiddenCategories));
            if(!raw) return { ...defaultView };
            return { ...defaultView, ...JSON.parse(raw) };
        } catch {
            return { ...defaultView };
        }
    }
    export function saveFilterView(view: FilterViewState, hiddenCategories: readonly (keyof FilterViewState)[] = []) {
        if(!browser) return;
        try {
            localStorage.setItem(viewStorageKey(hiddenCategories), JSON.stringify(view));
        } catch {
            // oh well
        }
    }

    export type FilterQuickState = {
        priorities: string[],
        due: string,
        users: { id: string, name: string }[],
        groups: { id: string, name: string }[],
        subprojects: { id: string, name: string }[],
        boards: { id: string, name: string }[],
        sections: { id: string, name: string }[],
        search: string
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

    export function createFilterState(hiddenCategories: readonly (keyof FilterViewState)[] = []): FilterState {
        return {
            filter: undefined,
            match: undefined,
            view: loadFilterView(hiddenCategories),
            quick: {
                priorities: [],
                due: "",
                users: [],
                groups: [],
                subprojects: [],
                boards: [],
                sections: [],
                search: ""
            }
        };
    }

    /** parse a query and store it (plus the string) on the filter state */
    export function setFilterQuery(filterState: FilterState, query: string): FilterNode | undefined {
        filterState.filterString = query;
        filterState.filter = query ? parseFilterString(query).node ?? undefined : undefined;
        return filterState.filter;
    }

    /**
     * rebuild filterState.match from the current filter. The matcher is a
     * function that _creates_ a per-card matcher for things like caching.
     */
    export function updateMatcher(filterState: FilterState) {
        filterState.match = filterState.filter ? () => {
            const cache = new Map<string, boolean>();
            return (card: TypedCardPreviewResponse): boolean => {
                if(cache.has(card.id)) return cache.get(card.id)!;
                const result = filterState.filter ? matchFilter(filterState.filter, card) : true;
                cache.set(card.id, result);
                return result;
            };
        } : undefined;
    }

    /** compose the quick-filter state into a single query string. */
    export function composeQuickQuery(quick: FilterQuickState): string {
        const clauses: string[] = [];

        if(quick.priorities.length > 0) {
            const orClause = quick.priorities.map((p) => `priority = "${p}"`).join(" or ");
            clauses.push(quick.priorities.length > 1 ? `(${orClause})` : orClause);
        }

        if(quick.due) {
            const dueQueries: Record<string, string> = {
                overdue: `due < today`,
                today: `due >= today and due < today+1`,
                week: `due > today and due < today+7`,
                month: `due >= today and due < today+30`
            };
            if(dueQueries[quick.due]) clauses.push(dueQueries[quick.due]);
        }

        // or together users and groups
        const assignmentClauses = [
            ...quick.users.map((u) => `any assignment has "${u.name}"`),
            ...quick.groups.map((g) => `any assignment has "${g.name}"`)
        ];
        if(assignmentClauses.length > 0) {
            clauses.push(assignmentClauses.length > 1 ? `(${assignmentClauses.join(" or ")})` : assignmentClauses[0]);
        }

        if(quick.subprojects.length > 0) {
            const orClause = quick.subprojects.map((s) => `any subprojects has "${s.name}"`).join(" or ");
            clauses.push(quick.subprojects.length > 1 ? `(${orClause})` : orClause);
        }

        if(quick.boards.length > 0) {
            const orClause = quick.boards.map((b) => `board = "${b.name}"`).join(" or ");
            clauses.push(quick.boards.length > 1 ? `(${orClause})` : orClause);
        }

        if(quick.sections.length > 0) {
            const orClause = quick.sections.map((s) => `section = "${s.name}"`).join(" or ");
            clauses.push(quick.sections.length > 1 ? `(${orClause})` : orClause);
        }

        if(quick.search.trim()) {
            const term = quick.search.trim();
            clauses.push(`(title ~ "${term}" or description ~ "${term}")`);
        }

        return clauses.join(" and ");
    }

    export function applyQuickQuery(filterState: FilterState, subprojects: { id: string, name?: string }[] = []) {
        let query = composeQuickQuery(filterState.quick);
        if(/^\(([^\(\)]*)\)$/.test(query)) {
            query = query.substring(1, query.length - 1);
        }
        setFilterQuery(filterState, query);
        updateMatcher(filterState);
    }
</script>

<script lang="ts">
    import { Clock, Flag, Funnel, Kanban, RotateCcw, SquarePlus, Tag, TextInitial, Users, View } from "lucide-svelte";
    import NewCardModal from "../NewCardModal.svelte";
    import type { ExpandResponse } from "$lib/pocketbase";
    import type { TypedBoardsResponse } from "$lib/data/project";
    import PopoverButton from "../../PopoverButton.svelte";
    import FilterMenu from "./FilterMenu.svelte";
    import { debounce } from "$lib/util";

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
        hiddenViewCategories?: readonly (keyof FilterViewState)[]
    } = $props();

    let newCardModal: NewCardModal | null = $state(null);

    const sections = $derived(board?.expand.sections ?? []);
    const subprojects = $derived(project.expand.subprojects ?? []);

    export function openNewCardModal(defaultSectionId?: string) {
        newCardModal?.open(defaultSectionId);
    }

    function onSearchInput(e: Event) {
        const target = e.target as HTMLInputElement;
        filterState.quick.search = target.value;
        applyQuickQuery(filterState, subprojects);
    }
    const onSearchDebounced = debounce(onSearchInput, 100, true);

    const hiddenViewItems = $derived(Object.values(filterState.view).filter(v => !v).length);
    // svelte doesn't like these inline for some reason
    const viewButtonClass = $derived(hiddenViewItems > 0 ? "selected" : "");
    const filterButtonClass = $derived(filterState.filter !== undefined ? "selected" : "");

    // Persist the active view whenever it changes, keyed by this view's hidden categories.
    $effect(() => {
        saveFilterView(filterState.view, hiddenViewCategories);
    });
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
            <FilterMenu bind:filterState {project} {board} {hiddenViewCategories} />
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
    <input
        type="text"
        placeholder="Search cards..."
        value={filterState.quick.search}
        oninput={onSearchDebounced}
    />
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