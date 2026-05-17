<script lang="ts">
    import type { CardsResponse } from "$lib/pocketbase/generated-types";

    const { card }: {
        card: CardsResponse;
    } = $props();
</script>

<div class="card">
    {card.title}
</div>

<style lang="scss">
.card {
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    background: var(--bg-secondary);
    font-size: var(--font-tiny);
}
</style>