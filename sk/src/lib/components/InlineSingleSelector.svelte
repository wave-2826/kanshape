<script lang="ts" generics="Item extends { id: string; name: string }">
    // I hate the code duplication here, but oh well...

	import { Check, ChevronDown } from "lucide-svelte";
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";
	import Portal from "./Portal.svelte";
	import { anchor } from "$lib/actions";

	const {
		value,
		data,
		onchange,
		itemName = "item",
		children
	}: {
		value: { id: string; name: string } | null,
		data: Item[],
		onchange: (id: string | null) => void,
		itemName?: string,
		children?: Snippet
	} = $props();

	let isOpen = $state(false);

	function select(item: { id: string }) {
        // If the item is already selected, deselect it
        if(value && value.id === item.id) {
            onchange(null);
            isOpen = false;
            return;
        }

		onchange(item.id);
		isOpen = false;
	}

	function handleWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if(!target.closest('.inline-dropdown') && !selectorInput?.contains(target)) {
			isOpen = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if(e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			isOpen = !isOpen;
		}
	}

	let selectorInput: HTMLDivElement | null = $state(null);
</script>

<svelte:window onclick={handleWindowClick} />

<div class="selector inline-selector">
	<div
		role="button"
		tabindex="0"
		class="input selector-trigger"
		onclick={() => isOpen = !isOpen}
		onkeydown={handleKeydown}
		bind:this={selectorInput}
	>
		{#if !value}
			<span class="placeholder">Select {itemName}...</span>
		{:else}
			<span class="selected-value">{value.name}</span>
		{/if}
		<ChevronDown class="dropdown-icon" />
	</div>

	{#if isOpen}
		<Portal target="body">
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<ul
				class="dropdown inline-dropdown"
				use:anchor={{ element: selectorInput, placement: "vauto-end", offset: 0 }}
				transition:fly={{ y: -10, duration: 100 }}
				onmousedown={(e) => e.stopPropagation()}
			>
			{#if children}
				<li class="dropdown-controls">
					{@render children()}
				</li>
			{/if}

			{#each data as item (item.id)}
				{@const isSelected = !!value && value.id === item.id}
				<li>
					<button type="button" class="dropdown-item" class:selected={isSelected} onclick={() => select(item)}>
						<span>{item.name}</span>
						{#if isSelected}
							<Check />
						{/if}
					</button>
				</li>
			{/each}
			</ul>
		</Portal>
	{/if}
</div>

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "../pocketbase/selector/selectors.scss";
</style>