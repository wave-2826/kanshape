<script lang="ts">
    import type { Snippet } from "svelte";
    import { fly } from "svelte/transition";

    const {
        children,
        content,
        class: className
    }: {
        children: Snippet,
        content: Snippet,
        /**
         * Note that styling this element will require :global() on the calling side
         * because of e.g. https://github.com/sveltejs/svelte/issues/2870
         */
        class?: string
    } = $props();

    let open = $state(false);
    let button: HTMLButtonElement;
</script>

<svelte:window on:click={(e) => {
    if(open && e.target instanceof Node && !button.contains(e.target)) {
        open = false;
    }
}} />

<button class={className} onclick={() => open = !open} bind:this={button}>
    {@render children()}
    {#if open}
        <div class="popover-content" transition:fly={{ y: 5, duration: 150 }}>
            {@render content()}
        </div>
    {/if}
</button>

<style lang="scss">
button {
    position: relative;
}
.popover-content {
    position: absolute;
    top: 100%;
    right: 0;
    min-width: 100%;
    margin-top: 0.25rem;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem;
    display: block;
    text-align: left;
}
</style>