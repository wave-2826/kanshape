<script lang="ts">
    import type { CardMetadataSection } from "$lib/data/project";
    import CardFieldTypeEditor from "./CardFieldEditor.svelte";
    import type { TypedCardsResponse } from "$lib/data/cards";

    let {
        fields, card = $bindable()
    }: {
        fields: CardMetadataSection["fields"],
        card: TypedCardsResponse
    } = $props();
</script>

<div class="properties">
    {#each fields as field}
        <div class="property" title={field.description}>
            <span class="prop-label">{field.name}</span>
            <div class="prop-value">
                <CardFieldTypeEditor {field} bind:card={card} />
            </div>
        </div>
    {/each}
</div>

<!-- svelte-ignore css_unused_selector - shared stylesheet -->
<style lang="scss">
@use "props.scss";

.property {
    // span at most 3 depending on the total columns
    grid-column: span 3;
}
</style>