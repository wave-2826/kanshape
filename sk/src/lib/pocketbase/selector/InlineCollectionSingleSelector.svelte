<script lang="ts" generics="Collection extends Collections">
    // The code duplication here is also annoying...
    
    import InlineSingleSelector from "$lib/components/InlineSingleSelector.svelte";
    import { client } from "$lib/pocketbase";
    import { debounce } from "$lib/util";
    import type { CollectionRecords, Collections } from "../generated-types";

    const {
        value,
        onchange,
        collection,
        searchField,
        itemName = "item"
    }: {
        value: { id: string, name: string } | null,
        onchange: (id: string | null, data: { id: string, name: string } | null) => void,
        collection: Collection,
        searchField: keyof CollectionRecords[Collection] & string,
        /** Name of the items being selected, e.g. "users" */
        itemName?: string
    } = $props();

    let searchTerm = $state("");
    let results = $state<({
        id: string
    } & {
        [searchField in keyof CollectionRecords[Collection]]: string   
    })[]>([]);
    const items = $derived(results.filter(r => (r[searchField] as string).toLowerCase().includes(searchTerm.toLowerCase())).map((result) => ({
        id: result.id,
        name: result[searchField] as string
    })));

    async function searchRaw(searchTerm: string) {        
        try {
            const filter = searchTerm ? `${searchField} ~ "${searchTerm.replace(/"/g, '\\"')}"` : "";
            const list = await client.collection(collection).getList(1, 10, {
                filter,
                requestKey: null
            });
            results = list.items as any[];
        } catch(e) {
            console.error(e);
            results = [];
        }
    }
    const search = debounce(searchRaw, 200);

    $effect(() => {
        search(searchTerm);
    });
</script>

<InlineSingleSelector value={value} data={items} onchange={(id) => {
    const selectedData = items.find(item => item.id === id) || null;
    onchange(id, selectedData);
}} {itemName}>
    <div class="search-input-wrapper">
        <!-- svelte-ignore a11y_autofocus -->
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Search..."
            autofocus
        />
    </div>
</InlineSingleSelector>

<style lang="scss">
.search-input-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
    
    input {
        --bg-color: var(--bg-secondary);
        width: 100%;
    }
}
</style>