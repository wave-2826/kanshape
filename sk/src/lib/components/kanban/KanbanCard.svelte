<script lang="ts">
    import { type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { Clock, Flag, Kanban, TextInitial, Users } from "lucide-svelte";
    import { getPriorityColor, type CardAssignmentData } from "./cards";
    import RelativeTime from "../RelativeTime.svelte";
    import { localDateFromDateOnly } from "$lib/datetime";
    import { type ExpandResponse } from "$lib/pocketbase";
    
    // TODO: Remove this silly assignment cache thing and manually
    // query for the expanded user/group data when needed. This requires one
    // more API call but saves a TON of redundant data. We wouldn't want to
    // make a separate call per card, though, so we need to load everything and
    // deduplicate first. 

    const {
        card,
        subprojects,
        onclick
    }: {
        card: ExpandResponse<"cards", "user_assignment_cache,group_assignment_cache">;
        subprojects: SubprojectsRecord[];
        onclick: () => void;
    } = $props();

    const assignment = $derived(card.assignment_data as CardAssignmentData);
</script>

<button class="unstyled card" {onclick} class:critical={card.priority === "critical"}>
    <div class="header">
        <h3>{card.title}</h3>
        {#if card.subproject !== ""}
            <span class="subproject"><Kanban />{subprojects.find((sp) => sp.id === card.subproject)?.name ?? card.subproject}</span>
        {/if}
    </div>

    {#if card.priority !== "low"}
        <span class="priority" style="color: {getPriorityColor(card.priority)}">
            <Flag />
            {card.priority}
        </span>
    {/if}

    {#if card.description}
        <span class="description item"><TextInitial /><span>{card.description}</span></span>
    {/if}

    {#if card.due_by}
        <span class="due item" style="{new Date(card.due_by) < new Date() ? 'color: var(--error)' : ""}" title={`Due ${
            new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(card.due_by))
        }`}>
            <Clock />
            <span>Due <RelativeTime date={new Date(card.due_by)} /></span>
        </span>
    {/if}

    {#if assignment}
        <span class="assignment item">
            <Users />
            {#snippet itemList(itemName: string, items: { name?: string }[])}
                {#if items.length === 0}
                    Assigned to no {itemName}s
                {:else if items.length === 1}
                    Assigned to <span class="item-name">{items[0].name}</span>
                {:else if items.length === 2}
                    Assigned to <span class="item-name">{items[0].name}</span> and <span class="item-name">{items[1].name}</span>
                {:else}
                    Assigned to <span class="item-name">{items[0].name}</span> and {items.length - 1} others
                {/if}
            {/snippet}
            {#if assignment.type === "users"}
                {@render itemList("user", card.expand.user_assignment_cache ?? [])}
            {:else if assignment.type === "groups"}
                {@render itemList("group", card.expand.group_assignment_cache ?? [])}
            {:else if assignment.type === "anyone_on"}
                Assigned to anyone on {
                    new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })
                        .format(localDateFromDateOnly(assignment.on_date))
                }
            {:else if assignment.type === "looking_for_assignment"}
                Looking for assignment
            {/if}
        </span>
    {/if}
</button>

<style lang="scss">
.card {
    all: unset;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    padding: 0.4rem 0.7rem;
    border-radius: 4px;
    background: var(--bg-secondary);
    font-size: var(--font-tiny);

    &.critical {
        border-top: 1px solid var(--error);
    }
}

.header {
    h3 {
        font-size: var(--font-small);
        display: inline;
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

    .item-name {
        color: var(--accent);
    }
}

.description {
    color: var(--text-secondary);

    span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
    }
}
</style>