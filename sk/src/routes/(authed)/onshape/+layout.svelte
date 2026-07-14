<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import type { Snippet } from "svelte";
    
    const { children }: { children: Snippet } = $props();

    const documentId = $derived(getOnshapeContext().documentId);
</script>

{@render children()}

{#if !documentId}
    <p>No documentId provided in query params</p>
{/if}

<style lang="scss">
</style>