<script lang="ts">
    import { Clock, Flag, Tag, TextInitial, Users } from "lucide-svelte";
    import { assignedToSelf, getPriorityColor, type CardAssignmentData } from "../../data/cards";
    import RelativeTime from "../RelativeTime.svelte";
    import { formatCloseDate, localDateFromDateOnly } from "$lib/datetime";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import { authModel } from "$lib/pocketbase/auth";
    import type { FilterViewState } from "./menu/KanbanMenu.svelte";

    const {
        card,
        onclick,
        view,
        inactive
    }: {
        card: TypedCardPreviewResponse,
        onclick: () => void,
        view: FilterViewState,
        /** Display as inactive for when filtering/searching */
        inactive?: boolean
    } = $props();

    const assignment = $derived(card.assignment_data as CardAssignmentData);
</script>

<button
    class="card"
    class:assigned={assignedToSelf(card, $authModel)}
    class:critical={card.priority === "critical"}
    class:inactive
    {onclick}
>
    <div class="header">
        <h3 class:untitled={!card.title.trim()}>{card.title.trim() ? card.title : "Untitled"}</h3>
        {#if view.subprojects}
            {#each card.subprojects as subproject}
                <span class="meta-pill subproject"><Tag />{subproject.name}</span>
            {/each}
        {/if}
    </div>

    {#if view.description && card.description}
        <span class="description item"><TextInitial /><span>{card.description}</span></span>
    {/if}

    {#if view.priority && card.priority !== "low"}
        <span class="priority item" style="color: {getPriorityColor(card.priority)}"><Flag /> {card.priority}</span>
    {/if}

    {#if view.due && card.due_by}
        <span class="due item" style="{new Date(card.due_by) < new Date() ? 'color: var(--error)' : ""}" title={`Due ${
            new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(card.due_by))
        }`}>
            <Clock />
            <span>Due <RelativeTime date={new Date(card.due_by)} /></span>
        </span>
    {/if}

    {#if view.assignment && assignment}
        <span class="assignment item" class:looking-for-assignment={assignment.type === "looking_for_assignment"}>
            <Users />
            <span>
                {#snippet itemList(itemName: string, items: string[])}
                    {#if items.length === 0}
                        Assigned to no {itemName}s
                    {:else if items.length === 1}
                        Assigned to <span class="item-name">{items[0]}</span>
                    {:else if items.length === 2}
                        Assigned to <span class="item-name">{items[0]}</span> and <span class="item-name">{items[1]}</span>
                    {:else}
                        Assigned to <span class="item-name">{items[0]}</span> and {items.length - 1} others
                    {/if}
                {/snippet}
                {#if assignment.type === "users"}
                    {@render itemList("user", card.assignment_name_cache ?? [])}
                {:else if assignment.type === "groups"}
                    {@render itemList("group", card.assignment_name_cache ?? [])}
                {:else if assignment.type === "anyone_on"}
                    Assigned to <span class="item-name">anyone</span> {formatCloseDate(localDateFromDateOnly(assignment.on_date))}
                {:else if assignment.type === "looking_for_assignment"}
                    Looking for assignment
                {/if}
            </span>
        </span>
    {/if}
</button>

<style lang="scss">
.card {
    --bg-color: var(--bg-secondary);

    text-align: left;
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    transition: opacity 0.1s ease;

    padding: 0.4rem 0.5rem;
    font-size: var(--font-tiny);

    &.assigned {
        border-top: 1px solid var(--accent);
        --bg-color: color-mix(in srgb, var(--accent) 3%, var(--bg-secondary) 90%);
    }
    &.critical {
        // overwrites assignment border
        border-top: 1px solid var(--error);
    }
    &.inactive {
        opacity: 0.25;
    }
}

.header {
    h3 {
        font-size: var(--font-small);
        display: inline;
        &.untitled {
            color: var(--text-tertiary);
            font-style: italic;
        }
    }
    .subproject {
        display: inline-flex;
        align-items: center;
        margin-left: 0.5rem;
        vertical-align: middle;
        gap: 0.25rem;
        color: var(--text-tertiary);
        font-size: var(--font-tiny);
    }
}

.priority {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-primary);
    font-size: var(--font-tiny);
    max-width: 100%;

    .item-name {
        color: var(--accent);
    }

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }
}

.description {
    color: var(--text-secondary);

    span {
        flex: 1;
    }
}

.assignment {
    &.looking-for-assignment {
        color: var(--error);
    }
    .assigned & {
        background-color: var(--bg-selection);
        padding: 3px 5px;
        margin-left: -3px;
        border-radius: 4px;
        font-weight: bold;
    }
}
</style>