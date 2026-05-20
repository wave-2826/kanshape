<script lang="ts">
    import type { CardsResponse } from "$lib/pocketbase/generated-types";
    import { Flag, TextInitial } from "lucide-svelte";
    import { getPriorityColor } from "./cards";

    const {
        card,
        onclick
    }: {
        card: CardsResponse;
        onclick: () => void;
    } = $props();
</script>

<button class="unstyled card" {onclick} class:critical={card.priority === "critical"}>
    <h3>{card.title}</h3>

    {#if card.priority !== "low"}
        <span class="priority" style="color: {getPriorityColor(card.priority)}">
            <Flag />
            {card.priority}
        </span>
    {/if}

    {#if card.description}
        <span class="description"><TextInitial /><span>{card.description}</span></span>
    {/if}
</button>

<style lang="scss">
.card {
    all: unset;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    padding: 0.35rem 0.7rem;
    border-radius: 4px;
    background: var(--bg-secondary);
    font-size: var(--font-tiny);

    &.critical {
        border-top: 1px solid var(--error);
    }
}
.priority {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}
h3 {
    font-size: var(--font-small);
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
</style>