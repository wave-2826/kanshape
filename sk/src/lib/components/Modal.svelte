<script lang="ts">
    import { pushState } from "$app/navigation";
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import { fade, fly } from "svelte/transition";

    const { id, children, forceOpen = false }: {
        id: string,
        children: Snippet<[{
            open: () => void,
            close: () => void
        }]>,
        forceOpen?: boolean
    } = $props();

    const openKey = $derived(`modal${id}Open`);

    export function open() {
        pushState('', { [openKey]: true });
    }
    export function close() {
        pushState('', { [openKey]: false });
    }

    const isOpen = $derived(page.state[openKey]);
</script>

<svelte:window onkeydown={(e) => {
    if(isOpen && e.key === "Escape" && !forceOpen) {
        close();
        e.preventDefault();
    }
}} />

{#if isOpen || forceOpen}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-box backdrop" onclick={(e) => {
    if(e.target === e.currentTarget) {
        close();
    }
}} transition:fade={{ duration: 100 }}>
    <dialog class="modal" open transition:fly={{ duration: 250, y: -20 }} closedby="none">
        {@render children({ open, close })}
    </dialog>
</div>
{/if}

<style lang="scss">
.modal-box {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    display: flex;
    justify-content: center;
    padding: 1rem;

    z-index: 100;
}
dialog {
    background-color: var(--bg-primary);
    border-radius: 4px;
    border: 1px solid var(--border);
    color: var(--text-primary);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    padding: 1rem 1.5rem;
}
</style>