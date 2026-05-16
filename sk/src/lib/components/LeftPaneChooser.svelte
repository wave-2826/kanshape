<script lang="ts">
    import { Plus, Trash2 } from "lucide-svelte";
    import type { Snippet } from "svelte";

    let selected: number | null = $state(null);

    const {
        options,
        pane,
        oncreate,
        ondelete
    }: {
        options: { name: string; tooltip?: string; color?: string }[],
        pane: Snippet<[number]>,
        oncreate?: () => void,
        ondelete?: (option: number) => void
    } = $props();
</script>

<div class="chooser">
    <ul>
        {#each options as option, i (i)}
            <li class="button" class:selected={selected === i}>
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
                        else if(selected && selected > i) selected = selected - 1;
                    }} class="unstyled action"><Trash2 /></button>
                {/if}
            </li>
        {/each}
        
        {#if oncreate}
            <li>
                <button onclick={() => {
                    oncreate();
                    selected = options.length - 1;
                }} class="label"><Plus />Create new</button>
            </li>
        {/if}
    </ul>
    <div class="pane">
        {#if selected !== null}
            {@render pane(selected)}
        {:else}
            <p class="select-option">Select an option</p>
        {/if}
    </div>
</div>

<style lang="scss">
.chooser {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    width: 100%;
}

ul {
    list-style: none;
    margin: 0;

    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 200px;
    max-height: 400px;
    width: max(200px, 25%);

    overflow: auto;

    li {
        display: flex;
        padding: 0;
    }
    .label {
        flex: 1;
        padding: 0.5rem;
    }
    .action {
        width: 2rem;
        color: var(--error);
        transition: color 0.2s;
        padding: 0.5rem;

        &:hover {
            color: color-mix(var(--text-primary) 25%, var(--error));
        }
    }
}
ul, .pane {
    background-color: var(--bg-primary);
    border-radius: 4px;
    padding: 0.5rem;
}
.pane {
    flex: 1;
}

.select-option {
    color: var(--text-secondary);
    font-style: italic;
    margin: 0.5rem;
}
</style>