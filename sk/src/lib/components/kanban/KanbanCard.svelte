<script lang="ts">
    import type { CardsResponse, SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { Clock, Flag, Kanban, TextInitial } from "lucide-svelte";
    import { getPriorityColor } from "./cards";
    import { relativeTime } from "$lib/datetime";
    import RelativeTime from "../RelativeTime.svelte";

    const {
        card,
        subprojects,
        onclick
    }: {
        card: CardsResponse;
        subprojects: SubprojectsRecord[];
        onclick: () => void;
    } = $props();
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
        <span class="description"><TextInitial /><span>{card.description}</span></span>
    {/if}

    {#if card.due_by}
        <span class="due" style="{new Date(card.due_by) < new Date() ? 'color: var(--error)' : ""}" title={`Due ${
            new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(card.due_by))
        }`}>
            <Clock />
            <span>Due <RelativeTime date={new Date(card.due_by)} /></span>
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

.description {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-secondary);
    font-size: var(--font-tiny);

    span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
    }
}
.due {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-primary);
    font-size: var(--font-tiny);
}
</style>