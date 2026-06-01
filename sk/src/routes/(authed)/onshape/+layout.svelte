<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import type { Snippet } from "svelte";
    
    const { children }: { children: Snippet } = $props();

    const documentId = $derived(getOnshapeContext().documentId);
</script>

{#if !documentId}
    <p>No documentId provided in query params</p>
{/if}

{@render children()}

<style lang="scss">
</style>