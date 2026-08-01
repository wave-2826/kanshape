<script lang="ts" generics="Item extends { id: string; name: string }">
	import { Check, ChevronDown, X } from "lucide-svelte";
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";
    import Portal from "./Portal.svelte";
    import { anchor } from "$lib/actions";

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
		<Portal target="body">
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<ul
				class="dropdown inline-dropdown"
				use:anchor={{ element: selectorInput, placement: "vauto-end", offset: 0 }}
				transition:fly={{ y: -10, duration: 100 }}
				onclick={(e) => e.stopPropagation()}
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
		</Portal>
	{/if}
</div>

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "../pocketbase/selector/selectors.scss";
</style>
