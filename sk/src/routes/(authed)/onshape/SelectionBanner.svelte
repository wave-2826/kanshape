<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import { nav } from "$lib/navigation";
    import type { OnshapeSelection } from "$lib/onshape/client";
    import { LoaderCircle } from "@lucide/svelte";

    const {
        selections
    }: {
        selections: OnshapeSelection[];
    } = $props();

    const onshapeCtx = getOnshapeContext();
    
    let loading = $state(false);
</script>

<header>
    {#if loading}
        <p>Loading...</p>
        <LoaderCircle class={$css("animate-spin")} />
    {:else if selections.length > 0}
        <p>
            Entity selected.
            <span class="ids">entities {selections.map(s => s.selectionId).join(", ")}</span>
        </p>
        <button onclick={() => {
            nav("/onshape/new" + (selections.length > 0 ? `?part=${JSON.stringify(selections[0])}` : ""))
        }}>Create card</button>
    {:else}
        <p>
            No selected parts.
            {#if onshapeCtx.location === "right-panel-part-studio"}Select something to create a card.{/if}
        </p>
        {#if onshapeCtx.location === "right-panel-assembly"}
            <button onclick={() => {
                nav("/onshape/new?selection=assembly")
            }}>Create assembly card</button>
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