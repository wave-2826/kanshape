<script lang="ts">
    import type { Snippet } from "svelte";
    import { fade, fly } from "svelte/transition";

    const {
        open,
        onclose,
        children
    }: {
        open: boolean,
        onclose: () => void,
        children: Snippet
    } = $props();

    // TODO: shallow routing for this
</script>

<svelte:document onkeydown={(e) => {
    if(e.key === "Escape" && open) {
        onclose();
        e.preventDefault();
        e.stopImmediatePropagation();
    }
}} />

{#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="backdrop" onclick={(e) => {
        if(e.target === e.currentTarget) onclose();
    }} transition:fade={{ duration: 200 }}>
        <div class="panel" transition:fly={{ duration: 200, x: 300, opacity: 0 }}>
            {@render children()}
        </div>
    </div>
{/if}

<style lang="scss">
.backdrop {
    position: absolute;
    inset: 0;
    z-index: 100;
}
.panel {
    position: absolute;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    border-right: none;
    width: max(55%, 400px);
    right: 0;
    top: 0;
    bottom: 0;
    margin: 1rem 0 1rem 1rem;
    border-radius: 4px 0 0 4px;
    box-shadow: -4px 0 15px rgba(0, 0, 0, 0.2);

    display: flex;
    flex-direction: column;
    padding: 1rem;
}
</style>