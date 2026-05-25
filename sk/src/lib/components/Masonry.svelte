<!-- 
    A lightweight masonry grid component.
    Based on https://github.com/janzheng/svelte-masonry/, which was originally
    based on: https://css-tricks.com/a-lightweight-masonry-solution

    Updated for Svelte 5, better update handling, and cleaner code.

    For async content (like images), you MUST bind and trigger refreshLayout:
    <Masonry bind:refreshLayout={refreshLayout}>
      <img on:load={refreshLayout} src="..." />
    </Masonry>

    Parameters:
        - stretchFirst (boolean): When true, stretches the first item across the full width
        - gridGap (string): Space between grid items (default: '0.5em')
        - padding (string): Padding around the entire grid (default: '0px')
        - colWidth (string): Column width using CSS grid values (default: 'minmax(Min(20em, 100%), 1fr)')
        - items (array): Optional array of data items - pass this if your grid content updates dynamically
        - refreshLayout (function): Bind to this to manually trigger layout updates

    Methods:
        - refreshLayout(): Critical for proper layout with async content
            Must be called:
            1. After images load (use on:load={refreshLayout})
            2. When adding/removing items
            3. When content dimensions change
            4. Automatically handles window resizing

    Usage Example (with async images):
    ```
        <Masonry bind:refreshLayout={refreshLayout}>
            {#each items as item}
                <img 
                on:load={refreshLayout} 
                src={item.url} 
                alt={item.alt}
                />
            {/each}
        </Masonry>
    ```
-->

<script lang="ts">
import { type Snippet, untrack } from 'svelte'

const {
    children,
    stretchFirst = false,
    gridGap = '0.5em',
    padding = '0px',
    colWidth = 'minmax(min(20em, 100%), 1fr)',
    items = []
}: {
    children: Snippet,
    stretchFirst?: boolean,
    gridGap?: string,
    padding?: string,
    colWidth?: string,
    /** pass in data if it's dynamically updated */
    items?: any[]
} = $props();

let grids: {
    element: HTMLDivElement,
    gap: number,
    items: HTMLElement[],
    columnCount: number,
    mod: number
}[] = [];
let masonryElement: HTMLDivElement | null = $state(null);

export const refreshLayout = async () => {
    grids.forEach(async grid => {
        // get the post-relayout number of columns
        const columnCount = getComputedStyle(grid.element).gridTemplateColumns.split(' ').length;
        
        grid.items.forEach(c => {
            const newHeight = c.getBoundingClientRect().height;
            if(newHeight !== (c.dataset.h ?? 0)) {
                c.dataset.h = String(newHeight);
                grid.mod++;
            }
        });
    
        // if the number of columns has changed
        if(grid.columnCount !== columnCount || grid.mod) {
            // update number of columns
            grid.columnCount = columnCount;
            // revert to initial positioning, no margin
            grid.items.forEach(c => c.style.removeProperty('margin-top'));
            
            // if we have more than one column, apply margin to create masonry effect
            if(grid.columnCount > 1) {
                grid.items.slice(columnCount).forEach((c, i) => {
                    const aboveBottom = grid.items[i].getBoundingClientRect().bottom;
                    const currentTop = c.getBoundingClientRect().top;
                    c.style.marginTop = `${aboveBottom + grid.gap - currentTop}px`;
                });
            }
            
            grid.mod = 0;
        }
    });
}

async function calcGrid(masonryArray: HTMLDivElement[]): Promise<void> {
    if(masonryArray.length && getComputedStyle(masonryArray[0]).gridTemplateRows !== 'masonry') {
        grids = masonryArray.map(grid => {
            return {
                element: grid, 
                gap: parseFloat(getComputedStyle(grid).rowGap),
                items: [...grid.childNodes].filter((c): c is HTMLElement =>
                    c instanceof HTMLElement && Number(getComputedStyle(c).gridColumnEnd) !== -1
                ), 
                columnCount: 0, 
                mod: 0
            }
        });
        refreshLayout(); // initial load
    }
};

let size: ResizeObserverSize[] | null = $state(null);
let width = $derived.by(() => size ? size[0].inlineSize : 0);

// Refresh if items or width changes
$effect(() => {
    void masonryElement;
    void items;
    void width;
    if(masonryElement && items && width) { 
        untrack(() => calcGrid([masonryElement!]))
    }
});
</script>

<div
    bind:this={masonryElement} 
    class="grid-masonry"
    class:stretch-first={stretchFirst}
    style={`
        --masonry-grid-gap: ${gridGap}; 
        --masonry-padding: ${padding};
        --masonry-col-width: ${colWidth};
    `}
    bind:contentBoxSize={size}
>
    {@render children()}
</div>

<style lang="scss">
.grid-masonry {
    display: grid;
    grid-template-columns: repeat(auto-fit, var(--masonry-col-width));
    // grid-template-rows: masonry;
    justify-content: center;
    grid-gap: var(--masonry-grid-gap);
    padding: var(--masonry-padding);
}
:global(.grid-masonry > *) { 
    align-self: start;
}
:global(.grid-masonry.stretch-first > *:first-child) { 
    grid-column: 1 / -1;
}
</style>