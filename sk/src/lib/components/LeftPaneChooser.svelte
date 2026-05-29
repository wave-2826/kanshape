<script lang="ts">
    import { GripHorizontal, Plus, Trash2 } from "lucide-svelte";
    import type { Snippet } from "svelte";

    let selected: number | null = $state(null);

    type OptionData = { name: string; tooltip?: string; color?: string };

    const {
        options,
        ordered = false,
        pane,
        oncreate,
        ondelete,
        onreorder,
        compact = false,
        background
    }: {
        options: OptionData[],
        ordered?: boolean,
        pane: Snippet<[number]>,
        oncreate?: () => void,
        ondelete?: (option: number) => void,
        onreorder?: (from: number, to: number) => void,
        compact?: boolean,
        background?: string
    } = $props();

    let dragState: {
        itemIndex: number,
        placeholderIndex: number,
        listRect: DOMRect
    } | null = $state(null);

    let listEl: HTMLUListElement;

    let offsetY = $state(0);
    let floatTop = $state(0);
    let floatLeft = $state(0);
    let floatWidth = $state(0);

    function startDrag(e: PointerEvent, index: number) {
        e.preventDefault();
        if(!listEl) return;
        const li = listEl.querySelector(`[data-index="${index}"]`) as HTMLElement | null;
        if(!li) return;
        
        dragState = {
            itemIndex: index,
            placeholderIndex: index,
            listRect: listEl.getBoundingClientRect()
        };

        const rect = li.getBoundingClientRect();
        offsetY = e.clientY - rect.top;
        floatTop = rect.top - (dragState.listRect.top ?? 0);
        floatLeft = rect.left - (dragState.listRect.left ?? 0);
        floatWidth = rect.width;

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', endDrag, { once: true });
    }

    function getInsertionIndex(pointerY: number) {
        if(dragState === null) return 0;

        let pos = options.length; // default to end
        for(let k = 0; k < options.length; k++) {
            const el = listEl.querySelector(`[data-index="${k}"]`) as HTMLElement | null;
            if(!el) continue;
            const r = el.getBoundingClientRect();
            const midpoint = r.top + r.height / 2;
            if(pointerY < midpoint) {
                pos = k;
                break;
            }
        }

        return pos;
    }

    function onPointerMove(e: PointerEvent) {
        if(dragState === null) return;
        
        const pointerY = e.clientY;
        floatTop = pointerY - (dragState.listRect.top ?? 0) - offsetY;

        const pos = getInsertionIndex(e.clientY);
        if(pos !== dragState.placeholderIndex) dragState.placeholderIndex = pos;
    }

    function endDrag() {
        if(dragState === null) {
            cleanupDrag();
            return;
        }

        // compute final insertion pos (as index in resulting array)
        const from = dragState.itemIndex;
        let to = getInsertionIndex(floatTop + offsetY + (dragState.listRect.top ?? 0));

        if(to > from) to = to - 1; // account for item being removed from original position

        if(from !== to) {
            onreorder?.(from, to);

            // update selected to new index
            if(selected !== null) {
                const selArr = options.map((_, i) => i);
                const selItem = selArr.splice(from, 1)[0];
                selArr.splice(to, 0, selItem);
                selected = selArr.indexOf(selected);
            }
        }

        cleanupDrag();
    }

    function cleanupDrag() {
        dragState = null;
        offsetY = 0;
        floatTop = 0;
        floatLeft = 0;
        floatWidth = 0;
        window.removeEventListener('pointermove', onPointerMove);
    }
</script>

{#snippet listItem(option: OptionData, i: number, {
    style = "",
    class: classname = ""
})}
    <li
        data-index={i} class={`list-item button ${classname}`} {style}
        class:selected={selected === i} class:dragging={dragState !== null}
    >
        {#if ordered}
            <button
                onclick={() => selected = i}
                class="unstyled action drag"
                onpointerdown={(ev) => startDrag(ev as PointerEvent, i)}
                aria-label="Reorder"
            ><GripHorizontal /></button>
        {/if}
        <button
            onclick={() => selected = i}
            class="unstyled label"
            style={option.color ? `color: ${option.color}` : undefined}
            title={option.tooltip}
        >
            {option.name}
        </button>
        {#if ondelete}
            <button onclick={() => {
                ondelete(i);
                if(selected === i) selected = null;
                else if(selected !== null && selected > i) selected = selected - 1;
            }} class="unstyled action delete"><Trash2 /></button>
        {/if}
    </li>
{/snippet}

<div class="chooser-container">
    <div class="chooser" class:compact={compact} style={background ? `--bg: ${background};` : undefined}>
        <ul bind:this={listEl}>
            {#each options as option, i (i)}
                {#if dragState !== null && dragState.placeholderIndex === i}
                    <li class="drag-placeholder button">
                        <div class="unstyled action button"><GripHorizontal /></div>
                    </li>
                {/if}
    
                {#if dragState === null || dragState.itemIndex !== i}
                    {@render listItem(option, i, {})}
                {/if}
            {/each}
            {#if dragState !== null && dragState.placeholderIndex === options.length}
                <li class="drag-placeholder end button">
                    <div class="unstyled action button"><GripHorizontal /></div>
                </li>
            {/if}
    
            {#if dragState !== null && dragState.placeholderIndex !== null}
                {@render listItem(options[dragState.itemIndex], dragState.placeholderIndex, {
                    style: `position: absolute; top: ${floatTop}px; left: ${floatLeft}px; width: ${floatWidth}px; z-index: 1000; pointer-events: none;`,
                    class: "drag-float"
                })}
            {/if}
            
            {#if oncreate}
                <li>
                    <button onclick={() => {
                        oncreate();
                        selected = options.length - 1;
                    }} class="label"><Plus />Create new</button>
                </li>
            {/if}
        </ul>
        <div class="pane" class:selected={selected !== null}>
            {#if selected !== null}
                {#key selected}
                    {@render pane(selected)}
                {/key}
            {:else}
                <p class="select-option">Select an option</p>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
.chooser-container {
    width: 100%;
    container: left-pane-chooser / inline-size;
}
.chooser {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    width: 100%;
    position: relative;
}

@container left-pane-chooser (max-width: 30rem) {
    .chooser {
        flex-direction: column;
    }
    .chooser ul {
        width: 100%;
        min-height: 0;
    }
}

ul {
    list-style: none;
    margin: 0;

    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-height: 200px;
    max-height: 400px;
    width: max(200px, 25%);

    .compact & {
        min-height: 0;
    }

    overflow: auto;

    position: relative;

    li {
        display: flex;
        padding: 0;
        gap: 0;

        &.list-item {
            padding: 0 0.25rem;
        }
    }
    .label {
        flex: 1;
        padding: 0.25em;
        text-align: left;
    }
    .action {
        width: 2rem;
        transition: color 0.2s;
        padding: 0.25rem;
        flex: 0;

        &.delete {
            color: var(--error);
        }
        &.delete:hover {
            color: color-mix(var(--text-primary) 25%, var(--error));
        }
        &.drag {
            color: var(--text-secondary);
            cursor: grab;
        }
        &.drag:active {
            cursor: grabbing;
        }
        &.drag:hover {
            color: var(--text-primary);
        }
    }

    .drag-float {
        user-select: none;
        z-index: 1000;
    }
    .drag-placeholder {
        user-select: none;
        opacity: 0.5;

        // Mostly to make the spacing the same lol
        .action { opacity: 0.2; }
    }
}

ul, .pane {
    background-color: var(--bg, var(--bg-primary));
    border-radius: 4px;
    padding: 0.5rem;
}
.pane {
    flex: 1;
    transition: opacity 150ms;

    &:not(.selected) {
        opacity: 0.5;
    }
}

.select-option {
    color: var(--text-secondary);
    font-style: italic;
    margin: 0.25rem;
}
</style>