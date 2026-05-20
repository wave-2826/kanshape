<script lang="ts">
    import type { CardsResponse } from "$lib/pocketbase/generated-types";

    const {
        card,
        onclick
    }: {
        card: CardsResponse;
        onclick: () => void;
    } = $props();
</script>

<button class="unstyled card" {onclick}>
    <h3>{card.title}</h3>
</button>

<style lang="scss">
.card {
    all: unset;
    display: block;
    width: 100%;
    
    padding: 0.35rem 0.7rem;
    border-radius: 4px;
    background: var(--bg-secondary);
    font-size: var(--font-tiny);
}
h3 {
    font-size: var(--font-tiny);
}
</style>