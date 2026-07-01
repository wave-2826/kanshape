<!--
Editor for a card value. The value must match the type given, and the parent is expected to handle
cases where the expected type doesn't match the value type by displaying a reset button or similar.
-->
<script lang="ts">
    import type { CardMetadata } from "$lib/data/cards";
    import type { CardMetadataFieldType } from "$lib/data/project";
    
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
</script>

{#if type.base === "text"}
    <input type="text" bind:value={get, set<string>} />
{:else if type.base === "number"}
    <input type="number" bind:value={get, set<number>} />
{:else if type.base === "checkbox"}
    <input type="checkbox" bind:checked={get, set<boolean>} />
{:else if type.base === "date"}
    <input type="date" bind:value={get, set<string>} />
{:else if type.base === "onshape_part"}
    <!-- TODO: Better selection for when user is in onshape -->
    <input type="text" bind:value={get, set<string>} />
{:else}
    <span>Unsupported field type: {type.base}</span>
{/if}

<style lang="scss">
    input {
        flex: 1;
        padding: 0.25rem 0.5rem;
    }
</style>