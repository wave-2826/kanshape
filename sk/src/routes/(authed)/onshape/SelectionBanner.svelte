<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import { getPartHeuristics } from "$lib/onshape/partHeuristics";
    import { LoaderCircle } from "lucide-svelte";

    const {
        selectedIDs
    }: {
        selectedIDs: string[] | null;
    } = $props();

    const onshapeCtx = getOnshapeContext();
    
    let loading = $state(false);

    async function createCard() {
        if(onshapeCtx.documentId && onshapeCtx.wvm && onshapeCtx.wvmId && onshapeCtx.partStudioId && selectedIDs && selectedIDs.length > 0) {
            loading = true;
            try {
                const heuristics = await getPartHeuristics(onshapeCtx.documentId, onshapeCtx.wvm, onshapeCtx.wvmId, onshapeCtx.partStudioId, selectedIDs[0]);
            
            } finally {
                loading = false;
            }
        }
    }
</script>

<header>
    {#if loading}
        <p>Loading...</p>
        <LoaderCircle class="animate-spin" />
    {:else if selectedIDs && selectedIDs.length > 0}
        <p>
            Part selected.
            <span class="ids">entities {selectedIDs.join(", ")}</span>
        </p>
        <button onclick={createCard}>Create card</button>
    {:else}
        <p>No selected parts. Select something to create a card.</p>
    {/if}
</header>

<style lang="scss">
header {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border);
    min-width: 0;

    p {
        display: flex;
        flex-direction: column;
        min-width: 0;
        overflow-wrap: break-word;
        color: var(--accent);
    }
    .ids {
        font-family: monospace;
        font-size: var(--font-tiny);
        color: var(--text-secondary);
    }

    button {
        white-space: nowrap;
    }

    :global(.animate-spin) {
        animation: spin 1s linear infinite;
    }
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>