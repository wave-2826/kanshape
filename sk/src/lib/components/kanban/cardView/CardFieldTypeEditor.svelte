<!--
Editor for a card value. The value must match the type given, and the parent is expected to handle
cases where the expected type doesn't match the value type by displaying a reset button or similar.
-->
<script lang="ts">
    import { autoSize } from "$lib/actions";
    import type { CardMetadata } from "$lib/data/cards";
    import { defaultMetadataFieldValue, type CardMetadataFieldType, type MetadataFile, type MetadataValue } from "$lib/data/project";
    import CachedCollectionSelector from "$lib/pocketbase/selector/CachedCollectionSelector.svelte";
    import UrlInput from "./UrlInput.svelte";
    import CardFieldTypeEditor from "./CardFieldTypeEditor.svelte";
    import { Plus, X } from "lucide-svelte";

    let {
        type, value = $bindable(),
        addFile, getFileUrl
    }: {
        type: CardMetadataFieldType<false>,
        value: CardMetadata[string]["value"],
        addFile: (name: string, file: File) => void,
        getFileUrl: (file: MetadataFile) => string
    } = $props();

    function get<T>(): T {
        return value as T;
    }
    function set<T extends CardMetadata[string]["value"]>(v: T) {
        value = v;
    }

    function _exhaustiveCheck(x: never) {
        return x;
    }
</script>

{#if type.base === "text"}
    <input type="text" bind:value={get, set<string>} />
{:else if type.base === "longtext"}
    <textarea bind:value={get, set<string>} placeholder="Enter description..." use:autoSize={value}></textarea>
{:else if type.base === "url"}
    <UrlInput bind:value={get, set<string>} />
{:else if type.base === "number"}
    <input type="number" bind:value={get, set<number>} />
{:else if type.base === "checkbox"}
    <input type="checkbox" bind:checked={get, set<boolean>} />
{:else if type.base === "date"}
    <input type="date" bind:value={get, set<string>} />
{:else if type.base === "onshape_part"}
    <!-- TODO: Better selection for when user is in onshape -->
    <input type="text" bind:value={get, set<string>} />
{:else if type.base === "user" || type.base === "group"}
    <div class="select">
        <CachedCollectionSelector
            collection={type.base === "user" ? "users" : "groups"}
            nameField="name"
            bind:value={get, set<null | string | string[]>}
            multi={type.multi}
        />
    </div>
{:else if type.base === "list"}
    <div class="list">
        {#each (value as MetadataValue[]) as item, index (index)}
            <div class="list-item">
                <CardFieldTypeEditor
                    type={type.field}
                    bind:value={() => item, (v) => {
                        let newValue = [...(value as MetadataValue[])];
                        newValue[index] = v;
                        set(newValue);
                    }}
                    {addFile} {getFileUrl}
                />
                <button onclick={() => {
                    let newValue = [...(value as MetadataValue[])];
                    newValue.splice(index, 1);
                    set(newValue);
                }} class="remove"><X /></button>
            </div>
        {/each}
        <button
            class="add-item"
            onclick={() => (value as MetadataValue[]).push(defaultMetadataFieldValue(type.field))}
        >
            <Plus /> Add {type.fieldName ?? "item"}
        </button>
    </div>
{:else if type.base === "tuple"}
    <div class="tuple">
        {#each type.fields as field, index}
            <CardFieldTypeEditor
                type={field}
                bind:value={() => (value as MetadataValue[])[index], (v) => {
                    let newValue = [...(value as MetadataValue[])];
                    newValue[index] = v;
                    set(newValue);
                }}
                {addFile} {getFileUrl}
            />
        {/each}
    </div>
{:else if type.base === "file"}
    {#if type.multi}
        <div class="files">
            {#each (value as MetadataFile[]) as file, index (index)}
                <div class="file-capsule">
                    <a href={getFileUrl(file)} target="_blank">{file.name}</a>
                    <button onclick={() => {
                        let newValue = [...(value as MetadataValue[])];
                        newValue.splice(index, 1);
                        set(newValue);
                    }} class="remove"><X /></button>
                </div>
            {/each}
            <input type="file" onchange={async (e) => {
                const files = (e.target as HTMLInputElement).files;
                if(files && files.length > 0) {
                    for(const file of files) {
                        // The actual name of the file isn't the uploaded name, but we store it
                        const generatedName = crypto.randomUUID().replace(/-/g, "");
                        addFile(generatedName + "." + file.name.split(".").pop(), file);
                        set([...(value as MetadataValue[]), { name: file.name, id: generatedName }]);
                    }
                }
            }} />
        </div>
    {:else}
        <p>todo: single files</p>
    {/if}
{:else}
    <span>Unsupported field type: {_exhaustiveCheck(type.base)}</span>
{/if}

<style lang="scss">
    input, textarea {
        flex: 1;
        padding: 0.25rem 0.5rem;
    }

    .select {
        display: contents;
        > :global(*) {
            flex: 1;
            min-width: 0;
        }
    }

    .list {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
        min-width: 0;

        .list-item {
            display: flex;
            gap: 0.25rem;
            
            > :global(:first-child) {
                flex: 1;
                min-width: 0;
            }
            .remove {
                padding: 0.25rem;
            }
        }

        .add-item {
            align-self: flex-end;
            gap: 0.25rem;
            padding: 0.25rem 0.5rem;
        }
    }

    .tuple {
        display: flex;
        gap: 0.25rem;
        flex: 1;
        min-width: 0;
    }
</style>