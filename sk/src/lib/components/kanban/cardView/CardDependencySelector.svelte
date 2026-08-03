<script lang="ts">
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import { Trash } from "@lucide/svelte";
    import KanbanListEntry from "../KanbanListEntry.svelte";
    import type { CardSelectState } from "./fieldEditor/uploadContext";
    import type { TypedCardsResponse } from "$lib/data/cards";

    let {
        dependencies = $bindable(),
        cards,
        card = $bindable(),
        onopendependency,
        onselectcard
    }: {
        dependencies: string[],
        cards: TypedCardPreviewResponse[],
        card: TypedCardsResponse,
        onopendependency?: (id: string) => void,
        onselectcard?: (state: CardSelectState) => void
    } = $props();
</script>

<div class="dependencies">
    {#each dependencies as depId (depId)}
        {@const card = cards.find((c) => c.id === depId)}
        {#if card !== undefined}
            <div class="dependency">
                <button class="remove-dependency" onclick={() => {
                    dependencies = dependencies.filter((id) => id !== depId);
                }} aria-label="Remove dependency"><Trash class={$css("remove")} /></button>
                <KanbanListEntry {card} onclick={() => {
                    onopendependency?.(card.id);
                }} />
            </div>
        {:else}
            <div class="dependency">Unknown dependency card</div>
        {/if}
    {/each}
    
    {#if onselectcard}
        <button class="add" onclick={() => {
            onselectcard?.({
                message: "Select a card to add as a dependency", 
                callback: (selected) => {
                    console.log("Selected", selected.title, "to add to", card.title);
                    if(selected.id === card.id) return;
                    if(dependencies.includes(selected.id)) return;
                    card.dependencies = [...card.dependencies, selected.id];
                }
            });
        }}>+ Add dependency</button>
    {/if}
</div>

<!-- svelte-ignore css_unused_selector - shared stylesheet -->
<style lang="scss">
@use "./props.scss";

.dependencies {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0 0.25rem;
}
.dependency {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    > :global(:last-child) {
        flex: 1;
    }
}
.remove-dependency {
    padding: 0.25rem;
    .remove {
        width: 1em;
        height: 1em;
    }
}
</style>