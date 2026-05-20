<script lang="ts">
    import type { CardsResponse } from "$lib/pocketbase/generated-types";
    import { Flag } from "lucide-svelte";

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
        <span class="priority" style="color: {
            card.priority === "medium" ? "var(--warning-medium)" :
            card.priority === "high" ? "var(--warning-high)" :
            card.priority === "critical" ? "var(--error)" :
            "inherit"
        }">
            <Flag />
            {card.priority}
        </span>
    {/if}
</button>

<style lang="scss">
.card {
    all: unset;
    display: flex;
    flex-direction: column;

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
    margin-top: 0.25rem;
}
h3 {
    font-size: var(--font-tiny);
}
</style>