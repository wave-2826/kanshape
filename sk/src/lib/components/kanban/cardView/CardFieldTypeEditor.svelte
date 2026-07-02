<!--
Editor for a card value. The value must match the type given, and the parent is expected to handle
cases where the expected type doesn't match the value type by displaying a reset button or similar.
-->
<script lang="ts">
    import { autoSize } from "$lib/actions";
    import type { CardMetadata } from "$lib/data/cards";
    import type { CardMetadataFieldType } from "$lib/data/project";
    import CachedCollectionSelector from "$lib/pocketbase/selector/CachedCollectionSelector.svelte";
    import UrlInput from "./UrlInput.svelte";

    let {
        type, value = $bindable()
    }: {
        type: CardMetadataFieldType,
        value: CardMetadata[string]["value"]
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
</style>