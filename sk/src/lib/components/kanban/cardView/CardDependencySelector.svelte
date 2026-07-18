<script lang="ts">
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import { Trash } from "lucide-svelte";
    import KanbanListEntry from "../KanbanListEntry.svelte";
    import type { TypedCardsResponse } from "$lib/data/cards";

    let {
        dependencies = $bindable(),
        boardCards,
        onopendependency,
        onselectcard
    }: {
        dependencies: string[],
        boardCards: TypedCardPreviewResponse[],
        onopendependency?: (id: string) => void,
        onselectcard?: (message: string, cb: (card: TypedCardPreviewResponse, originalCard: TypedCardsResponse) => void) => void
    } = $props();
</script>

<div class="dependencies">
    {#each dependencies as depId (depId)}
        {@const card = boardCards.find((c) => c.id === depId)}
        {#if card !== undefined}
            <div class="dependency">
                <button class="remove-dependency" onclick={() => {
                    dependencies = dependencies.filter((id) => id !== depId);
                }} aria-label="Remove dependency"><Trash class={$css("remove")} /></button>
                <KanbanListEntry {card} onclick={() => {
                    onopendependency?.(card.id);
                }} />
            </div>
        {/if}
    {/each}
    
    <button class="add" onclick={() => {
        onselectcard?.("Select a card to add as a dependency", (card, originalCard) => {
            console.log("Selected", card.title, "to add to", originalCard.title);
            if(card.id === originalCard.id) return;
            if(dependencies.includes(card.id)) return;
            originalCard.dependencies = [...originalCard.dependencies, card.id];
        });
    }}>+ Add dependency</button>
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