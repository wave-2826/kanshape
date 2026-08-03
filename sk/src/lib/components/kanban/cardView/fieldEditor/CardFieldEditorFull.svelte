<!-- The full card field editor that shows warnings for mismatched types. -->

<script lang="ts">
    import type { TypedCardsCreate, TypedCardsResponse } from "$lib/data/cards";
    import { TriangleAlert } from "@lucide/svelte";
    import CardFieldEditor from "./CardFieldEditor.svelte";
    import { getUploadContext } from "./uploadContext";
    import { checkMetadataValue, CREATE_SYMBOL, defaultMetadataFieldValue, type CardMetadataField } from "$lib/data/metadata";
    
    let {
        field, card = $bindable()
    }: {
        field: CardMetadataField & { id: string },
        card: TypedCardsResponse | TypedCardsCreate
    } = $props();

    const metadataItem = $derived(card.metadata && card.metadata[field.id] ? card.metadata[field.id] : {
        type: field.type,
        value: defaultMetadataFieldValue(field.type)
    });
    const valueTypeIsValid = $derived(
        metadataItem.type && (metadataItem.type.base === CREATE_SYMBOL || checkMetadataValue(field.type, metadataItem.value))
    );
    // If the value isn't valid for the field type, we use the stored type instead
    const usedType = $derived(
        (valueTypeIsValid && metadataItem.type.base !== CREATE_SYMBOL) || !metadataItem.type ? field.type : metadataItem.type
    );

    const uploadContext = getUploadContext();

    function set(newValue: typeof metadataItem.value) {
        card.metadata = {
            ...card.metadata,
            [field.id]: {
                type: usedType,
                // reuse the old object if possible to maintain reactivity
                value: (
                    metadataItem.value && typeof metadataItem.value === "object" &&
                    newValue && typeof newValue === "object" &&
                    !Array.isArray(metadataItem.value) && !Array.isArray(newValue)
                ) ? Object.assign(
                    metadataItem.value,
                    newValue
                ) : newValue
            }
        };
        uploadContext.update();
    }
</script>

<div class="card-field-editor">
    {#if !valueTypeIsValid}
        <button class="invalid-value-warning" title="Value type doesn't match field type.
This probably means the field was changed, so the old type was stored.
Reset this field to its default value?" onclick={() => {
            // We don't set() since we want to reset the type as well
            card.metadata = {
                ...card.metadata,
                [field.id]: {
                    type: field.type,
                    value: defaultMetadataFieldValue(field.type)
                }
            };
            uploadContext.update();
        }}>
            <TriangleAlert />
            Reset
        </button>
    {/if}
    {#if field.unknown}
        <button class="invalid-value-warning" title="This field is unknown to the current project.
It may have been removed or renamed, but is still present on this card.
Remove this field?" onclick={() => {
            // We don't set() since we want to reset the type as well
            const { [field.id]: _, ...rest } = card.metadata ?? {};
            card.metadata = rest;
            uploadContext.update();
        }}>
            <TriangleAlert />
            Unknown
        </button>
    {/if}

    <CardFieldEditor
        type={usedType} bind:value={() => metadataItem.value, set}
        cardId={"id" in card ? card.id : undefined}
    />
</div>

<style lang="scss">
.card-field-editor {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;

    .invalid-value-warning {
        color: var(--warning-medium);
        padding: 0.25rem 0.5rem;
    }
}
</style>