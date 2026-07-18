<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import { LoaderCircle } from "lucide-svelte";

    const {
        selectedIDs
    }: {
        selectedIDs: string[] | null;
    } = $props();

    const onshapeCtx = getOnshapeContext();
    
    let loading = $state(false);

    async function createCard() {
        // TODO
    }
</script>

<header>
    {#if loading}
        <p>Loading...</p>
        <LoaderCircle class={$css("animate-spin")} />
    {:else if selectedIDs && selectedIDs.length > 0}
        <p>
            Entity selected.
            <span class="ids">entities {selectedIDs.join(", ")}</span>
        </p>
        <button onclick={createCard}>Create card</button>
    {:else}
        <p>
            No selected parts.
            {#if onshapeCtx.location === "right-panel-part-studio"}Select something to create a card.{/if}
        </p>
        {#if onshapeCtx.location === "right-panel-assembly"}
            <button onclick={createCard}>Create card for assembly</button>
        {/if}
    {/if}
</header>

<style lang="scss">
header {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.65rem;
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
        
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    button {
        white-space: nowrap;
    }

    .animate-spin {
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