<script lang="ts">
    import type { Snippet } from "svelte";
    import { fly } from "svelte/transition";
    import Portal from "./Portal.svelte";
    import { anchor } from "$lib/actions";

    const {
        children,
        content,
        class: className,
        style,
        contentClass,
        title,
        gap
    }: {
        children: Snippet,
        content: Snippet,
        /**
         * Note that styling this element will require :global() OR $css() with svelte-css-rune on
         * the calling side because of e.g. https://github.com/sveltejs/svelte/issues/2870
         */
        class?: string | string[],
        style?: string,
        contentClass?: string,
        title?: string,
        gap?: number
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

<button class={className} onclick={(e) => {
    open = !open;
    e.stopPropagation();
}} bind:this={button} {title} {style}>
    {@render children()}
    {#if open}
        <Portal target="body">
            <div
                class={["popover-content", contentClass]}
                transition:fly={{ y: 5, duration: 150 }}
                use:anchor={{ element: button, placement: "vauto-inner", offset: gap ?? 5 }}
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
// 0 specificity to allow overriding
:where(.popover-content) {
    min-width: 150px;
    max-width: 90vw;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem;
    display: block;
    text-align: left;
    z-index: 1000;
    width: max-content;
}
</style>