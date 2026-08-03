<script lang="ts">
    import CardFieldEditorFull from "./CardFieldEditorFull.svelte";
    import type { TypedCardsCreate, TypedCardsResponse } from "$lib/data/cards";
    import { Trash } from "@lucide/svelte";
    import type { CardMetadataSection } from "$lib/data/metadata";

    let {
        fields, card = $bindable()
    }: {
        fields: CardMetadataSection["fields"],
        card: TypedCardsResponse | TypedCardsCreate
    } = $props();
</script>

<div class="properties">
    {#each fields as field}
        <div class="property">
            <span class="prop-label" title={field.description}>
                {field.name}
                {#if field.allowsClearing && card.metadata && card.metadata[field.id] !== undefined}
                    <button class="clear" onclick={() => {
                        if(card.metadata) {
                            delete card.metadata[field.id];
                        }
                    }} title="Clear">
                        <Trash />
                    </button>
                {/if}
            </span>
            <div class="prop-value">
                <CardFieldEditorFull {field} bind:card />
            </div>
        </div>
    {/each}
</div>

<!-- svelte-ignore css_unused_selector - shared stylesheet -->
<style lang="scss">
@use "../props.scss";

.property {
    // span at most 3 depending on the total columns
    grid-column: span 3;
}
</style>