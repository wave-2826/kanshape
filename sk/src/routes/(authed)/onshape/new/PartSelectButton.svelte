<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import type { OnshapeNewCardSelectionState } from "./+page.svelte";

    let {
        part = $bindable()
    }: {
        part: OnshapeNewCardSelectionState
    } = $props();

    const onshapeCtx = getOnshapeContext();

    let selecting = $state(false);
</script>

<div class="buttons" title="Select a part to add to this card.">
    {#if !part}
        <button onclick={async () => {
            selecting = true;
            const sel = await onshapeCtx.client?.waitForClientSelection();
            if(sel && sel.length > 0) part = sel[0];
        }} disabled={selecting}>{selecting ? "Select a part..." : "Select part"}</button>
        {#if onshapeCtx.location === "right-panel-assembly"}
            <button onclick={() => {
                part = "assembly";
            }}>Select this assembly</button>
        {/if}
    {/if}
</div>

<style lang="scss">
.buttons {
    display: flex;
    gap: 0.5rem;
}
</style>