<!--
Editor for a card value. The value must match the type given, and the parent is expected to handle
cases where the expected type doesn't match the value type by displaying a reset button or similar.
-->
<script lang="ts">
    import { autoSize } from "$lib/actions";
    import CachedCollectionSelector from "$lib/pocketbase/selector/CachedCollectionSelector.svelte";
    import UrlInput from "./UrlInput.svelte";
    import CardFieldEditor from "./CardFieldEditor.svelte";
    import { Plus, X } from "lucide-svelte";
    import CardPartEditor from "../../../parts/CardPartEditor.svelte";
    import CardPart from "$lib/components/parts/CardPart.svelte";
    import type { CreationPart } from "$lib/components/parts/partData";
    import CardFieldFilesEditor from "./CardFieldFilesEditor.svelte";
    import { CREATE_SYMBOL, type CardMetadata, type CardMetadataFieldType, type MetadataFile, type MetadataValue, defaultMetadataFieldValue } from "$lib/data/metadata";

    let {
        type, value = $bindable(),
        cardId
    }: {
        type: CardMetadataFieldType,
        value: CardMetadata[string]["value"],
        cardId?: string
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

{#if type.base === "empty"}
    <span class="empty">No value</span>
{:else if type.base === "text"}
    <input type="text" bind:value={get, set<string>} />
{:else if type.base === "longtext"}
    <textarea bind:value={get, set<string>} placeholder="Enter description..." use:autoSize={value}></textarea>
{:else if type.base === "url"}
    <UrlInput bind:value={get, set<string>} />
{:else if type.base === "number"}
    <input type="number" bind:value={get, (v) => set(Number(v))} />
{:else if type.base === "checkbox"}
    <input type="checkbox" bind:checked={get, set<boolean>} />
{:else if type.base === "date"}
    <input type="date" bind:value={get, set<string>} />
{:else if type.base === "onshape_part"}
    <CardPartEditor bind:value={get, set<string>} {cardId} />
{:else if type.base === CREATE_SYMBOL && type.create === "onshape_part"}
    <CardPart bind:part={value as CreationPart} />
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
                <CardFieldEditor
                    type={type.field}
                    bind:value={() => item, (v) => {
                        let newValue = [...(value as MetadataValue[])];
                        newValue[index] = v;
                        set(newValue);
                    }}
                    {cardId}
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
            onclick={() => (value as MetadataValue[]) = [...(value as MetadataValue[]), defaultMetadataFieldValue(type.field)]}
        >
            <Plus /> Add {type.fieldName ?? "item"}
        </button>
    </div>
{:else if type.base === "tuple"}
    <div class="tuple">
        {#each type.fields as field, index}
            <CardFieldEditor
                type={field}
                bind:value={() => (value as MetadataValue[])[index], (v) => {
                    let newValue = [...(value as MetadataValue[])];
                    newValue[index] = v;
                    set(newValue);
                }}
                {cardId}
            />
        {/each}
    </div>
{:else if type.base === "file"}
    <CardFieldFilesEditor bind:value={get, set<MetadataFile | MetadataFile[] | null>} type={type} />
{:else if type.base === "select"}
    {@const isOther = type.allow_other && typeof value === "string" && !type.options.some(o => o.id === value)}
    <div class="custom-select" class:is-other={isOther}>
        <select bind:value={() => {
            if(isOther) {
                return "other";
            } else {
                return value;
            }
        }, (v) => {
            if(v === "other") {
                set("");
            } else {
                set(v);
            }
        }}>
            {#each type.options as option}
                <option value={option.id}>{option.value}</option>
            {/each}
            {#if type.allow_other}
                <option value="other">Other...</option>
            {/if}
        </select>
        {#if isOther}
            <input type="text" bind:value={get, set<string>} placeholder="Custom value..." />
        {/if}
    </div>
{:else if type.base === CREATE_SYMBOL}
    <span>Unsupported field type: {type.create}</span>
{:else}
    <span>Unsupported field type: {_exhaustiveCheck(type.base)}</span>
{/if}

<style lang="scss">
.empty {
    font-style: italic;
    color: var(--text-secondary);
}

input, textarea {
    flex: 1;
    padding: 0.25rem 0.5rem;
    min-width: 0;
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

.custom-select {
    display: flex;
    min-width: min-content;
    flex: 0;

    &.is-other select {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        width: 5rem;
    }
    &.is-other input[type="text"] {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        flex: 0;
        width: 10rem;
        border-left: 1px solid var(--border);
    }
}
</style>