<!-- A selection component that fetches the item data automatically without requiring the caller to -->

<script lang="ts"  generics="Collection extends Collections">
    import { client } from '..';
    import type { CollectionRecords, Collections } from '../generated-types';
    import InlineCollectionSelector from './InlineCollectionSelector.svelte';
    import InlineCollectionSingleSelector from './InlineCollectionSingleSelector.svelte';

    let {
        collection,
        nameField,
        value = $bindable(),
        multi = false
    }: {
        collection: Collection,
        nameField: keyof CollectionRecords[Collection] & string,
        value: null | string | string[],
        multi?: boolean
    } = $props();

    let items = $state<{
        id: string,
        name: string
    }[]>([]);

    // Used to supress re-fetching when we already get the data from the selector itself.
    // This is a bit hacky, but it works consistently.
    let suppress = false;
    $effect(() => {
        if(suppress) return;
        
        if(multi) {
            if(!Array.isArray(value)) {
                value = [];
            }
            client.collection(collection).getList(1, 100, {
                filter: `id = "${(value).join('" || id = "')}"`,
                requestKey: null
            }).then(list => {
                items = list.items.map(item => ({
                    id: item.id,
                    name: item[nameField] as string
                }));
            });
        } else {
            if(value && typeof value === "string") {
                client.collection(collection).getOne(value, {
                    requestKey: null
                }).then(record => {
                    items = [{
                        id: record.id,
                        name: record[nameField] as string
                    }];
                });
            } else {
                items = [];
            }
        }
    });
</script>

{#if multi}
    <InlineCollectionSelector
        collection={collection}
        searchField={nameField as any}
        values={items}
        onchange={(ids, datas) => {
            suppress = true;
            value = ids;
            items = datas;
            setTimeout(() => suppress = false, 0);
        }}
    />
{:else}
    <InlineCollectionSingleSelector
        collection={collection}
        searchField={nameField as any}
        value={items[0]}
        onchange={(id, data) => {
            suppress = true;
            value = id;
            items = data ? [data] : [];
            setTimeout(() => suppress = false, 0);
        }}
    />
{/if}