<script lang="ts">
    import { Clock, Flag, Kanban, Tag, TextInitial, Users } from "@lucide/svelte";
    import { assignedToSelf, getPriorityColor, type CardAssignmentData } from "../../data/cards";
    import RelativeTime from "../RelativeTime.svelte";
    import { formatCloseDate, localDateFromDateOnly } from "$lib/datetime";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import { authModel } from "$lib/pocketbase/auth";
    import type { FilterViewState } from "./menu/KanbanMenu.svelte";
    
    const {
        card,
        onclick,
        showBoard = false,
        boardColor = "var(--text-tertiary)",
        view,
        inactive = false
    }: {
        card: TypedCardPreviewResponse,
        onclick: () => void,
        showBoard?: boolean,
        boardColor?: string,
        view?: FilterViewState,
        /** Display as inactive for when filtering/searching */
        inactive?: boolean
    } = $props();

    const assignment = $derived(card.assignment_data as CardAssignmentData | null);
</script>

<button
    class="card"
    class:assigned={assignedToSelf(card, $authModel)}
    class:critical={card.priority === "critical"}
    class:inactive
    {onclick}
>
    <div class="main">
        <h3 class:untitled={!card.title.trim()}>{card.title.trim() ? card.title : "Untitled"}</h3>
        {#if (!view || view.board) && showBoard && card.board_name}
            <span class="meta-pill" style="color: {boardColor}"><Kanban /><span>{card.board_name}</span></span>
        {/if}

        {#if !view || view.subprojects}
            {#each card.subprojects as subproject}
                <span class="meta-pill subproject">
                    <Tag />
                    <span>{subproject.name}</span>
                </span>
            {/each}
        {/if}
        
        {#if !view || view.section}
            <span class="meta-pill section" style="color: {card.section_color ?? 'var(--text-primary)'}">
                <Kanban />
                <span>{card.section_name ?? card.section}</span>
            </span>
        {/if}

        {#if !view || view.priority}
            <span class="meta-pill" style="color: {getPriorityColor(card.priority)}"><Flag />{card.priority}</span>
        {/if}

        {#if (!view || view.due) && card.due_by}
            <span class="meta-pill" style="{new Date(card.due_by) < new Date() ? 'color: var(--error)' : ""}" title={`Due ${
                new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(card.due_by))
            }`}>
                <Clock />
                <span><RelativeTime date={new Date(card.due_by)} /></span>
            </span>
        {/if}

        {#if (!view || view.assignment) && assignment}
            <span class="meta-pill assignment" class:looking-for-assignment={assignment.type === "looking_for_assignment"}>
                <Users />
                <span>
                    {#if assignment.type === "users" || assignment.type === "groups"}
                        {#if card.assignment_name_cache?.length === 0}
                            Unassigned
                        {:else if card.assignment_name_cache?.length === 1}
                            <span class="item-name">{card.assignment_name_cache[0]}</span>
                        {:else if card.assignment_name_cache}
                            <span class="item-name">{card.assignment_name_cache[0]}</span> +{card.assignment_name_cache.length - 1}
                        {:else}
                            Assigned
                        {/if}
                    {:else if assignment.type === "anyone_on"}
                        <span class="item-name">Anyone</span> {formatCloseDate(localDateFromDateOnly(assignment.on_date))}
                    {:else if assignment.type === "looking_for_assignment"}
                        Looking for assignment
                    {/if}
                </span>
            </span>
        {/if}
    </div>

    {#if (!view || view.description) && card.description}
        <div class="description"><TextInitial /><span>{card.description}</span></div>
    {/if}
</button>

<style lang="scss">
.card {
    flex-shrink: 0;

    display: flex;
    flex-direction: column;
    align-items: flex-start;
    overflow: hidden;
    text-align: left;

    transition: opacity 0.1s ease;

    --bg-color: var(--bg-secondary);
    padding: 0.25rem 0.7rem;
    font-size: var(--font-tiny);

    &.assigned {
        border-left: 1px solid var(--accent);
        --bg-color: color-mix(in srgb, var(--accent) 3%, var(--bg-secondary) 90%);
    }
    &.critical {
        // overwrites assignment border
        border-left: 1px solid var(--error);
    }
    &.inactive {
        opacity: 0.25;
    }
}

.main {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.25rem;

    h3 {
        margin: 0;
        font-size: var(--font-small);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        &.untitled {
            color: var(--text-tertiary);
            font-style: italic;
        }
    }
}

.description {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--text-tertiary);
    font-style: italic;

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }
}

.meta-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-primary);
    font-size: var(--font-tiny);
    white-space: nowrap;
    min-width: 0;

    border-radius: 100vh;
    padding: 0.1rem 0.4rem;
    background-color: var(--bg-primary);

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &.subproject {
        color: var(--text-tertiary);
    }
}

.assignment {
    &.looking-for-assignment { color: var(--error); }
    .item-name { color: var(--accent); }

    .assigned & {
        background-color: var(--bg-selection);
        box-shadow: 0 0 0 2px inset var(--bg-primary);
        font-weight: bold;
    }
}

.main, .description {
    max-width: 100%;
}
</style>