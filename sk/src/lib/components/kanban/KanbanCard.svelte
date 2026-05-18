<script lang="ts">
    import type { CardsResponse } from "$lib/pocketbase/generated-types";

    const { card }: {
        card: CardsResponse;
    } = $props();
</script>

<div class="card">
    <h3>{card.title}</h3>
</div>

<style lang="scss">
.card {
    padding: 0.35rem 0.7rem;
    border-radius: 4px;
    background: var(--bg-secondary);
    font-size: var(--font-tiny);
}
h3 {
    font-size: var(--font-tiny);
}
</style>