<!--
    A searchable block-style selector that allows selecting records from the given collection.
-->

<script lang="ts" generics="Collection extends Collections">
    import { batch, client, save } from "$lib/pocketbase";
    import { debounce } from "$lib/util";
    import { X } from "lucide-svelte";
    import { fly } from "svelte/transition";
    import type { CollectionRecords, Collections } from "../generated-types";

    const {
        values,
        onchange,
        collection,
        saveToRelation,
        searchField
    }: {
        values: { id: string, name: string }[],
        onchange: (ids: string[]) => void,
        collection: Collection,
        /**
         * If set, this acts as a back-relation selector and will automatically save changes to
         * the given field on the records from the collection with the given record id. The field
         * must be a relation to this collection.
         * 
         * For example, a use case for this would be selecting users for a group, where collection
         * is users and saveToRelation is ["groups", groupId]. Do not use this in the case where
         * a multi-relation exists on a separate record referencing the collection this selector
         * is for. In that case, save to the record separately in onchange.
         */
        saveToRelation?: [field: keyof CollectionRecords[Collection] & string, record_id: string],
        searchField: keyof CollectionRecords[Collection] & string
    } = $props();

    let searchTerm = $state("");
    let results = $state<({
        id: string
    } & {
        [searchField in keyof CollectionRecords[Collection]]: string   
    })[]>([]);
    // Simple client-side filter to further narrow down results as user types
    const clientFilteredResults = $derived(results.filter(r => r[searchField].toLowerCase().includes(searchTerm.toLowerCase())));
    let isFocused = $state(false);

    async function searchRaw(searchTerm: string, _isFocused: boolean) {
        try {
            const filter = searchTerm ? `${searchField} ~ "${searchTerm.replace(/"/g, '\\"')}"` : "";
            const list = await client.collection(collection).getList(1, 10, {
                filter,
                // Don't auto cancel
                requestKey: null
            });
            results = list.items.filter(item => !values.find(v => v.id === item.id)) as any[];
        } catch(e) {
            console.error(e);
            results = [];
        }
    }
    const search = debounce(searchRaw, 200);

    $effect(() => {
        search(searchTerm, isFocused);
    });

    async function changed(ids: string[]) {
        if(!saveToRelation) {
            onchange(ids);
            return;
        }

        // Diff with the old members and only send the changes to the server
        const oldIds = new Set(values ? values.map(v => v.id) : []);
        const newIds = new Set(ids);
        const added = ids.filter(id => !oldIds.has(id));
        const removed = values ? values.filter(v => !newIds.has(v.id)).map(v => v.id) : [];

        await batch(async (batch) => {
            for(const id of added) {
                await save(collection satisfies string, {
                    id,
                    [`${saveToRelation[0]}+`]: [saveToRelation[1]]
                }, {
                    batch, create: false
                }).catch(e => console.error("Failed to add user to group:", e));
            }
            for(const id of removed) {
                await save(collection satisfies string, {
                    id,
                    [`${saveToRelation[0]}-`]: [saveToRelation[1]]
                }, {
                    batch, create: false
                }).catch(e => console.error("Failed to remove user from group:", e));
            }
        });

        onchange(ids);
    }

    function remove(id: string) {
        changed(values.filter(v => v.id !== id).map(v => v.id));
    }

    function add(item: any) {
        changed([...values.map(v => v.id), item.id]);
        searchTerm = "";
        results = results.filter(r => r.id !== item.id);
        search("", false)
    }
</script>

<div class="selector block-selector">
    {#if values.length > 0}
        <div class="selected-values">
            {#each values as value}
                <span class="badge">
                    {value.name}
                    <button type="button" class="unstyled remove-btn" onclick={() => remove(value.id)}>
                        <X />
                    </button>
                </span>
            {/each}
        </div>
    {/if}
    
    <div class="search-container">
        <input 
            type="text" 
            bind:value={searchTerm} 
            placeholder="Search to add..."
            class="search-input"
            bind:focused={isFocused}
        />
        
        {#if isFocused && clientFilteredResults.length > 0}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <ul class="dropdown" transition:fly={{ y: -10, duration: 100 }} onmousedown={(e) => e.preventDefault()}>
                {#each clientFilteredResults as result}
                    <li>
                        <button type="button" class="dropdown-item" onclick={() => add(result)}>
                            {result[searchField]}
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "./selectors.scss";
</style>

