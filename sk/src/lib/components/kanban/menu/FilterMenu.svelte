<script lang="ts">
    import { debounce } from "$lib/util";
    import { matchFilter, parseFilterString, stringifyFilterNode } from "./filter";
    import type { FilterState, FilterViewState } from "./KanbanMenu.svelte";
    import type { ExpandResponse } from "$lib/pocketbase";
    import InlineCollectionSelector from "$lib/pocketbase/selector/InlineCollectionSelector.svelte";
    import InlineSelector from "$lib/components/InlineSelector.svelte";
    import { Collections } from "$lib/pocketbase/generated-types";
    import type { TypedBoardsResponse } from "$lib/data/project";
    import { Clock, Flag, Kanban, Tag, Users } from "lucide-svelte";
    import { getPriorityColor } from "$lib/data/cards";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import { authModel } from "$lib/pocketbase/auth";
    import { getGroupName } from "../nameCache";

    const {
        filterState = $bindable(),
        project,
        board,
        hiddenViewCategories = []
    }: {
        filterState: FilterState,
        project: ExpandResponse<"projects", "subprojects,boards">,
        board?: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        hiddenViewCategories?: (keyof FilterViewState)[]
    } = $props();

    const priorityOptions = [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "critical", label: "Critical" }
    ] as const;

    const dueOptions = [
        { value: "overdue", label: "Overdue", query: `due < today` },
        { value: "today", label: "Due today", query: `due >= today and due < today+1` },
        { value: "week", label: "Due this week", query: `due > today and due < today+7` },
        { value: "month", label: "Due this month", query: `due >= today and due < today+30` }
    ] as const;

    const subprojects = $derived(project.expand.subprojects ?? []);
    const boards = $derived(project.expand.boards ?? []);
    const sections = $derived(board?.expand.sections ?? []);

    const quick = $derived(filterState.quick);
    const selectedPriorities = $derived(quick.priorities);
    const dueFilter = $derived(quick.due);
    const selectedUsers = $derived(quick.users);
    const selectedGroups = $derived(quick.groups);
    const selectedSubprojects = $derived(quick.subprojects);
    const selectedBoards = $derived(quick.boards);
    const selectedSections = $derived(quick.sections);

    const assignedToMeActive = $derived.by(() => {
        const auth = $authModel;
        if(!auth) return false;

        const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

        const userIds = quick.users.map((u) => u.id);
        const groupIds = quick.groups.map((g) => g.id);
        const targetUserIds = auth.name ? [auth.id] : [];
        const targetGroupIds = auth.groups ?? [];

        return sameSet(userIds, targetUserIds) && sameSet(groupIds, targetGroupIds);
    });

    function composeQuery(): string {
        const clauses: string[] = [];

        if(quick.priorities.length > 0) {
            const orClause = quick.priorities.map((p) => `priority = "${p}"`).join(" or ");
            clauses.push(quick.priorities.length > 1 ? `(${orClause})` : orClause);
        }

        if(quick.due) {
            const option = dueOptions.find((o) => o.value === quick.due);
            if(option) clauses.push(option.query);
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

        return clauses.join(" and ");
    }

    function updateMatcher() {
        filterState.match = filterState.filter ? () => {
            let cache = new Map<string, boolean>();
            return (card: TypedCardPreviewResponse): boolean => {
                if(cache.has(card.id)) return cache.get(card.id)!;
                const result = filterState.filter ? matchFilter(filterState.filter, card, {
                    subprojects
                }) : true;
                console.log("matching card", card.title, "with filter", result);
                cache.set(card.id, result);
                return result;
            };
        } : undefined;
    }

    function applyQuery() {
        let query = composeQuery();
        if(/^\(([^\(\)]*)\)$/.test(query)) {
            query = query.substring(1, query.length - 1);
        }
        filterState.filterString = query;
        filterState.filter = query ? parseFilterString(query).node ?? undefined : undefined;
        updateMatcher();
    }

    function togglePriority(value: string) {
        filterState.quick.priorities = filterState.quick.priorities.includes(value)
            ? filterState.quick.priorities.filter((p) => p !== value)
            : [...filterState.quick.priorities, value];
        applyQuery();
    }

    function setDue(value: string) {
        filterState.quick.due = filterState.quick.due === value ? "" : value;
        applyQuery();
    }

    // filter to cards assigned to the current user
    async function assignedToMe() {
        const auth = $authModel;
        if(!auth) return;

        const users = auth.name ? [{ id: auth.id, name: auth.name }] : [];
        const groups = await Promise.all((auth.groups ?? []).map(async (id) => ({
            id,
            name: await getGroupName(id)
        })));

        filterState.quick.users = users;
        filterState.quick.groups = groups;
        applyQuery();
    }

    function clearAll() {
        filterState.quick.priorities = [];
        filterState.quick.due = "";
        filterState.quick.users = [];
        filterState.quick.groups = [];
        filterState.quick.subprojects = [];
        filterState.quick.boards = [];
        filterState.quick.sections = [];
        filterState.filterString = "";
        filterState.filter = undefined;
        updateMatcher();
    }

    // editing the raw query input directly clears other state

    function updateQuery(e: InputEvent) {
        const target = e.target as HTMLInputElement;
        filterState.filterString = target.value;
        filterState.filter = target.value ? parseFilterString(target.value).node ?? undefined : undefined;
        updateMatcher();

        filterState.quick.priorities = [];
        filterState.quick.due = "";
        filterState.quick.users = [];
        filterState.quick.groups = [];
        filterState.quick.subprojects = [];
        filterState.quick.boards = [];
        filterState.quick.sections = [];
    }
    const updateQueryDebounced = debounce(updateQuery, 200);
</script>

<div class="filter-content">
    <div class="group">
        <span class="group-label"><Flag /> Priority</span>
        <div class="chips">
            {#each priorityOptions as option}
                <button
                    type="button"
                    class:selected={selectedPriorities.includes(option.value)}
                    style="color: {getPriorityColor(option.value)}"
                    onclick={() => togglePriority(option.value)}
                >
                    {option.label}
                </button>
            {/each}
        </div>
    </div>

    <div class="group">
        <span class="group-label"><Clock /> Due date</span>
        <div class="chips">
            {#each dueOptions as option}
                <button
                    type="button"
                    class:selected={dueFilter === option.value}
                    onclick={() => setDue(option.value)}
                >
                    {option.label}
                </button>
            {/each}
        </div>
    </div>

    <div class="group">
        <span class="group-label"><Users /> Assigned to</span>
        <button type="button" class="assigned-to-me" class:selected={assignedToMeActive} onclick={assignedToMe} disabled={!$authModel}>
            Assigned to me
        </button>
        <InlineCollectionSelector
            collection={Collections.Users}
            searchField="name"
            values={selectedUsers}
            onchange={(ids, datas) => { filterState.quick.users = datas; applyQuery(); }}
            itemName="users"
        />
        <InlineCollectionSelector
            collection={Collections.Groups}
            searchField="name"
            values={selectedGroups}
            onchange={(ids, datas) => { filterState.quick.groups = datas; applyQuery(); }}
            itemName="groups"
        />
    </div>

    {#if subprojects.length > 0}
        <div class="group">
            <span class="group-label"><Tag /> Subprojects</span>
            <InlineSelector
                values={selectedSubprojects}
                data={subprojects.map((s) => ({ id: s.id, name: s.name ?? "Unknown subproject" }))}
                onchange={(ids) => {
                    filterState.quick.subprojects = subprojects
                        .filter((s) => ids.includes(s.id))
                        .map((s) => ({ id: s.id, name: s.name ?? "Unknown subproject" }));
                    applyQuery();
                }}
                itemName="subprojects"
            />
        </div>
    {/if}

    {#if !hiddenViewCategories.includes("board") && boards.length > 0}
        <div class="group">
            <span class="group-label"><Kanban /> Board</span>
            <InlineSelector
                values={selectedBoards}
                data={boards.map((b) => ({ id: b.id, name: b.title ?? "Unknown board" }))}
                onchange={(ids) => {
                    filterState.quick.boards = boards
                        .filter((b) => ids.includes(b.id))
                        .map((b) => ({ id: b.id, name: b.title ?? "Unknown board" }));
                    applyQuery();
                }}
                itemName="boards"
            />
        </div>
    {/if}

    {#if !hiddenViewCategories.includes("section") && sections.length > 0}
        <div class="group">
            <span class="group-label"><Kanban /> Section</span>
            <InlineSelector
                values={selectedSections}
                data={sections.map((s) => ({ id: s.id, name: s.title ?? "Unknown section" }))}
                onchange={(ids) => {
                    filterState.quick.sections = sections
                        .filter((s) => ids.includes(s.id))
                        .map((s) => ({ id: s.id, name: s.title ?? "Unknown section" }));
                    applyQuery();
                }}
                itemName="sections"
            />
        </div>
    {/if}

    <hr />

    <div class="raw">
        <input
            type="text"
            placeholder="Filter query..."
            value={filterState.filterString ?? (filterState.filter ? stringifyFilterNode(filterState.filter) : "")}
            oninput={updateQueryDebounced}
        />
        <button type="button" class="clear" onclick={clearAll} disabled={!filterState.filterString && selectedPriorities.length === 0 && !dueFilter && selectedUsers.length === 0 && selectedGroups.length === 0 && selectedSubprojects.length === 0 && selectedBoards.length === 0 && selectedSections.length === 0}>
            Clear
        </button>
    </div>
</div>

<style lang="scss">
.filter-content {
    font-size: var(--font-small);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 25rem;
}

.group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    .group-label {
        font-weight: 600;
        color: var(--text-secondary);
        font-size: var(--font-tiny);

        display: flex;
        align-items: center;
        gap: 0.35em;
    }
}

.assigned-to-me {
    align-self: flex-start;
}

.chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}

hr {
    margin: 0.5rem 0 0 0;
}

.raw {
    display: flex;
    gap: 0.5rem;
    font-size: var(--font-tiny);

    &:hover, &:focus-within {
        input {
            opacity: 1;
        }
    }

    input {
        flex: 1;
        opacity: 0.7;
        transition: opacity 0.2s ease;
    }
    input, button {
        padding: 0.25rem 0.5rem;
    }
}
</style>