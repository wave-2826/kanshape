<script lang="ts">
    import { X } from "lucide-svelte";
    import type { Snippet } from "svelte";
    import { MediaQuery } from "svelte/reactivity";
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

    const mobileLayout = $derived(new MediaQuery("screen and (max-width: 640px)").current);
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
        <div
            class="panel"
            transition:fly={mobileLayout ? { duration: 200, y: 100, opacity: 0 } : { duration: 200, x: 300, opacity: 0 }}
        >
            {#if mobileLayout}
                <button onclick={onclose} class="mobile-close">
                    <X />
                </button>
            {/if}
            {@render children()}
        </div>
    </div>
{/if}

<style lang="scss">
.backdrop {
    position: absolute;
    inset: 0;
    z-index: 1000;
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

.mobile-close {
    --bg-color: transparent;
    position: absolute;
    bottom: 100%;
    right: 0;
    -webkit-tap-highlight-color: transparent;

    > :global(svg) {
        width: 1.5rem;
        height: 1.5rem;
    }
}

@media (max-width: 640px) {
    .backdrop {
        position: fixed;
        inset: 0;
        --intensity: 0.25;
    }
    .panel {
        width: auto;
        left: 0.5rem;
        right: 0.5rem;
        bottom: 0;
        margin: 3rem 0 0 0;
        border-radius: 4px 4px 0 0;
        border: 1px solid var(--border);
        border-bottom: none;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
}
</style>