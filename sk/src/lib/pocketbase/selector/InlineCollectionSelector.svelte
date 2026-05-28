<script lang="ts" generics="Collection extends Collections">
    import InlineSelector from "$lib/components/InlineSelector.svelte";
    import { client } from "$lib/pocketbase";
    import { debounce } from "$lib/util";
    import type { CollectionRecords, Collections } from "../generated-types";

    const {
        values,
        onchange,
        collection,
        searchField,
        itemName = "items"
    }: {
        values: { id: string, name: string }[],
        onchange: (ids: string[], datas: { id: string, name: string }[]) => void,
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

<InlineSelector values={values} data={items} onchange={(ids) => {
    const selectedDatas = items.filter(item => ids.includes(item.id)).map(item => ({ id: item.id, name: item.name }));
    onchange(ids, selectedDatas);
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
</InlineSelector>

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