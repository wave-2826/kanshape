<script lang="ts" generics="ID">
let {
    options,
    selected = $bindable(),
    style = ""
}: {
    options: { text: string, tooltip?: string, id: ID }[],
    selected: ID[],
    style?: string
} = $props();
</script>

<div class="list-chooser" {style}>
    {#each options as option}
        <button 
            class:selected={selected.includes(option.id)} 
            onclick={() => {
                if(selected.includes(option.id)) selected = selected.filter(id => id !== option.id);
                else selected = [...selected, option.id];
            }}
            title={option.tooltip}
        >
            {option.text}
        </button>
    {/each}
</div>

<style lang="scss">
.list-chooser {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.5rem;

    // background-color: var(--bg, var(--bg-secondary));
    border-radius: 4px;
    padding: 0.5rem;
    border: 1px solid var(--border);

    button {
        --bg-color: var(--btn-bg, var(--bg-secondary));
    }
}
</style>