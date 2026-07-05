<script lang="ts">
    import type { TypedCardsResponse } from "$lib/data/cards";
    import { type CardMetadataField, checkMetadataValue, defaultMetadataFieldValue, type MetadataFile, walkMetadataValues } from "$lib/data/project";
    import { TriangleAlert } from "lucide-svelte";
    import CardFieldTypeEditor from "./CardFieldTypeEditor.svelte";
    import { debounce } from "$lib/util";
    import { Collections, type FileNameString } from "$lib/pocketbase/generated-types";
    import { client } from "$lib/pocketbase";
    
    let {
        field, card = $bindable(),
        updateCard
    }: {
        field: CardMetadataField<false> & { id: string },
        card: TypedCardsResponse,
        updateCard: (card: TypedCardsResponse) => void
    } = $props();

    const metadataItem = $derived(card.metadata && card.metadata[field.id] ? card.metadata[field.id] : {
        type: field.type,
        value: defaultMetadataFieldValue(field.type)
    });
    const valueTypeIsValid = $derived(checkMetadataValue(field.type, metadataItem.value));
    // If the value isn't valid for the field type, we use the stored type instead
    const usedType = $derived(valueTypeIsValid ? field.type : metadataItem.type);

    function set(newValue: typeof metadataItem.value) {
        card.metadata = {
            ...card.metadata,
            [field.id]: {
                type: usedType,
                value: newValue
            }
        };

        updateCardFilesDebounced();
    }

    let uploadQueue: { name: string, file: File }[] = [];

    async function updateCardFiles() {
        // 1. check what files the metadata still contains
        let metadataFiles: string[] = [];
        walkMetadataValues(usedType, metadataItem.value, (ty, val) => {
            if(ty.base === "file") {
                if(ty.multi) {
                    metadataFiles.push(...(val as MetadataFile[]).map(f => f.id));
                } else {
                    metadataFiles.push((val as MetadataFile).id);
                }
            }
        });

        // 2. remove files that are no longer referenced in the metadata from the card and the upload queue
        // Since Pocketbase adds random suffixes, we check if any of the metadata files are prefixes of each
        // file in the card's files array.
        let removedFiles = card.files.filter(f => !metadataFiles.some(mf => f.startsWith(mf)));

        // 3. construct an array of Files of new files to upload with the changed names
        let newFiles = uploadQueue
            .filter(f => !card.files.some(cf => cf.startsWith(f.name as FileNameString)))
            .map(f => new File([f.file], f.name, { type: f.file.type, lastModified: f.file.lastModified }));

        // 4. update the record with additions and removals
        console.log("Updating card files:", { newFiles, removedFiles });

        if(newFiles.length === 0 && removedFiles.length === 0) {
            return;
        }

        updateCard(await client.collection(Collections.Cards).update(card.id, {
            "files+": newFiles.length > 0 ? newFiles : undefined,
            "files-": removedFiles.length > 0 ? removedFiles : undefined
        }, {
            requestKey: null // don't cancel
        }));
    }
    const updateCardFilesDebounced = debounce(updateCardFiles, 100);
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
        }}>
            <TriangleAlert />
            Reset
        </button>
    {/if}

    <CardFieldTypeEditor
        type={usedType} bind:value={() => metadataItem.value, set}
        addFile={async (name: string, file: File) => {
            uploadQueue.push({ name, file });
            updateCardFilesDebounced();
        }}
        getFileUrl={(file) => {
            console.log("Getting file URL for", file.id, $state.snapshot(card.files));
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