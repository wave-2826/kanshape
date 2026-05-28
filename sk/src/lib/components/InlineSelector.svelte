<script lang="ts" generics="Item extends { id: string; name: string }">
	import { Check, ChevronDown, X } from "lucide-svelte";
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";

	const {
		values,
		data,
		onchange,
		itemName = "items",
		children
	}: {
		values: { id: string; name: string }[],
		data: Item[],
		onchange: (ids: string[]) => void,
		itemName?: string,
		children?: Snippet
	} = $props();

	let isOpen = $state(false);

	function toggle(item: { id: string }) {
		const isSelected = values.find((value) => value.id === item.id);
		if(isSelected) {
			onchange(values.filter((value) => value.id !== item.id).map((value) => value.id));
		} else {
			onchange([...values.map((value) => value.id), item.id]);
		}
	}

	function handleWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if(!target.closest('.inline-selector')) {
			isOpen = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if(e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			isOpen = !isOpen;
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
		onkeydown={handleKeydown}
	>
		{#if values.length === 0}
			<span class="placeholder">Select {itemName}...</span>
		{:else}
			<div class="selected-values-inline">
				{#each values as value (value.id)}
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
			{#if children}
				<li class="dropdown-controls">
					{@render children()}
				</li>
			{/if}

			{#each data as item (item.id)}
				{@const isSelected = !!values.find((value) => value.id === item.id)}
				<li>
					<button type="button" class="dropdown-item" class:selected={isSelected} onclick={() => toggle(item)}>
						<span>{item.name}</span>
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
@use "../pocketbase/selector/selectors.scss";

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

    .dropdown-controls {
        padding: 0.5rem;
        position: sticky;
        top: 0;
        background: var(--bg-primary);
        z-index: 10;
    }
}
</style>
