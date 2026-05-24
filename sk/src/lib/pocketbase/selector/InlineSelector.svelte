<!--
    An inline searchable selector that allows selecting records from the given collection.
    Mimics a standard select input layout.
-->

<script lang="ts" generics="Collection extends Collections">
    import { client } from "$lib/pocketbase";
    import { debounce } from "$lib/util";
    import { Check, ChevronDown, X } from "lucide-svelte";
    import { fly } from "svelte/transition";
    import type { CollectionRecords, Collections } from "../generated-types";

    const {
        values,
        onchange,
        collection,
        searchField,
        itemName = "items"
    }: {
        values: { id: string, name: string }[],
        onchange: (ids: string[]) => void,
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
    
    const clientFilteredResults = $derived(results.filter(r => (r[searchField] as string).toLowerCase().includes(searchTerm.toLowerCase())));
    let isOpen = $state(false);

    async function searchRaw(searchTerm: string, _isOpen: boolean) {        
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
        search(searchTerm, isOpen);
    });

    function toggle(item: any) {
        const isSelected = values.find(v => v.id === item.id);
        if(isSelected) {
            onchange(values.filter(v => v.id !== item.id).map(v => v.id));
        } else {
            onchange([...values.map(v => v.id), item.id]);
        }
    }

    function handleWindowClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if(!target.closest('.inline-selector')) {
            isOpen = false;
        }
    }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="selector inline-selector">
    <div 
        role="button" 
        tabindex="0"
        class="input selector-trigger" 
        onclick={() => isOpen = !isOpen}
        onkeydown={(e) => {
            if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen = !isOpen; }
        }}
    >
        {#if values.length === 0}
            <span class="placeholder">Select {itemName}...</span>
        {:else}
            <div class="selected-values-inline">
                {#each values as value}
                    <span class="badge">
                        {value.name}
                        <button type="button" class="unstyled remove-btn" onclick={(e) => { e.stopPropagation(); toggle(value); }}>
                            <X />
                        </button>
                    </span>
                {/each}
            </div>
        {/if}
        <ChevronDown class="dropdown-icon" />
    </div>
    
    {#if isOpen}
        <!-- TODO: Make this dropdown escape its parent scrolling containers and be positioned correctly relative to the page -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <ul
            class="dropdown inline-dropdown"
            transition:fly={{ y: -10, duration: 100 }}
            onmousedown={(e) => e.stopPropagation()}
        >
            <div class="search-input-wrapper">
                <!-- svelte-ignore a11y_autofocus -->
                <input 
                    type="text" 
                    bind:value={searchTerm} 
                    placeholder="Search..."
                    class="search-input"
                    autofocus
                />
            </div>
            {#each clientFilteredResults as result}
                {@const isSelected = !!values.find(v => v.id === result.id)}
                <li>
                    <button type="button" class="dropdown-item" class:selected={isSelected} onclick={() => toggle(result)}>
                        <span>{result[searchField]}</span>
                        {#if isSelected}
                            <Check />
                        {/if}
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "./selectors.scss";

.selector-trigger {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
    gap: 0.5rem;
    min-width: 10rem;
    max-width: 16rem;
    min-height: 1.875rem;
    
    text-align: left;
    
    .badge {
        font-size: var(--font-tiny);
    }
    
    .placeholder {
        color: var(--text-tertiary);
    }
    
    .selected-values-inline {
        display: flex;
        gap: 0.25rem;
        flex: 1;
    
        overflow-x: auto;
        scrollbar-width: thin;
    }
    .dropdown-icon {
        color: var(--text-secondary);
        flex-shrink: 0;
    }
}

.inline-dropdown {
    min-width: 5rem;
    width: max-content;
    padding: 0;

    left: auto;
    right: 0;
    
    .search-input-wrapper {
        padding: 0.5rem;
        position: sticky;
        top: 0;
        background: var(--bg-primary);
        z-index: 10;
    }
    .search-input {
        --bg-color: var(--bg-secondary);
    }
}
</style>