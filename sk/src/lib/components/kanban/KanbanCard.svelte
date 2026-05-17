<script lang="ts">
    import type { CardsResponse } from "$lib/pocketbase/generated-types";

    const { card }: {
        card: CardsResponse;
    } = $props();
</script>

{card.title}