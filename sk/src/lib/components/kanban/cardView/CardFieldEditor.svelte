<script lang="ts">
    import type { TypedCardsResponse } from "$lib/data/cards";
    import { type CardMetadataField, checkMetadataValue, defaultMetadataFieldValue } from "$lib/data/project";
    import { TriangleAlert } from "lucide-svelte";
    import CardFieldTypeEditor from "./CardFieldTypeEditor.svelte";
    import { client } from "$lib/pocketbase";
    import { getUploadContext } from "./CardViewPanel.svelte";
    
    let {
        field, card = $bindable()
    }: {
        field: CardMetadataField<false> & { id: string },
        card: TypedCardsResponse
    } = $props();

    const metadataItem = $derived(card.metadata && card.metadata[field.id] ? card.metadata[field.id] : {
        type: field.type,
        value: defaultMetadataFieldValue(field.type)
    });
    const valueTypeIsValid = $derived(checkMetadataValue(field.type, metadataItem.value));
    // If the value isn't valid for the field type, we use the stored type instead
    const usedType = $derived(valueTypeIsValid ? field.type : metadataItem.type);

    const uploadContext = getUploadContext();

    function set(newValue: typeof metadataItem.value) {
        card.metadata = {
            ...card.metadata,
            [field.id]: {
                type: usedType,
                value: newValue
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

    <CardFieldTypeEditor
        type={usedType} bind:value={() => metadataItem.value, set}
        addFile={async (name: string, file: File) => {
            uploadContext.queueUpload(name, file);
        }}
        getFileUrl={(file) => {
            // Files are given random suffixes by pocketbase, so we just find the file
            // in the card's files array. could be a little cleaner, but whatever.
            const foundFile = card.files.find(f => f.startsWith(file.id)) ?? file.id;
            const url = new URL(client.files.getURL(card, foundFile));
            url.searchParams.set("download", "1");
            return url.toString();
        }}
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