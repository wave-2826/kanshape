<script lang="ts">
    import type { Snippet } from "svelte";
    import { fly } from "svelte/transition";
    import Portal from "./Portal.svelte";
    import { anchor } from "$lib/actions";

    const {
        children,
        content,
        class: className,
        title
    }: {
        children: Snippet,
        content: Snippet,
        /**
         * Note that styling this element will require :global() on the calling side
         * because of e.g. https://github.com/sveltejs/svelte/issues/2870
         */
        class?: string,
        title?: string
    } = $props();

    let open = $state(false);
    let button: HTMLButtonElement | null = $state(null);
    let popover: HTMLDivElement | null = $state(null);
</script>

<svelte:window on:click={(e) => {
    if(open && e.target instanceof Node && !button?.contains(e.target) && !popover?.contains(e.target)) {
        open = false;
    }
}} />

<button class={className} onclick={() => open = !open} bind:this={button} {title}>
    {@render children()}
    {#if open}
        <Portal target="body">
            <div
                class="popover-content"
                transition:fly={{ y: 5, duration: 150 }}
                use:anchor={{ element: button, placement: "bottom-end", offset: 5 }}
                bind:this={popover}
            >
                {@render content()}
            </div>
        </Portal>
    {/if}
</button>

<style lang="scss">
button {
    position: relative;
    z-index: 100;
}
.popover-content {
    min-width: 150px;
    max-width: 90vw;
    margin-top: 0.25rem;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem;
    display: block;
    text-align: left;
}
</style>