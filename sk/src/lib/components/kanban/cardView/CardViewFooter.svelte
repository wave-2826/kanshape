<script lang="ts">
    import type { TypedCardsResponse } from "$lib/data/cards";
    import { deleteRecord } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { ExternalLink, Trash } from "lucide-svelte";
    import { getUsername } from "./nameCache";
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";

    const { card, projectId }: { card: TypedCardsResponse, projectId: string } = $props();

    function deleteCard() {
        const id = card.id;
        if(!id) return;
        deleteRecord(Collections.Cards, id);
    }

    const creationUsername = $derived(card?.created_by ? getUsername(card.created_by) : null);

    const onshapeContext = getOnshapeContext();
</script>

<footer>
    {#if onshapeContext.onOnshape}
        <button onclick={() => {
            // open card in kanshape board view
            const boardId = card.board;
            const cardId = card.id;
            const url = `/projects/${projectId}/boards/${boardId}?card=${cardId}`;
            window.open(window.location.origin + url, "_blank");
        }}>
            <ExternalLink /> Open in new tab
        </button>
    {:else}
        <div class="metadata">
            <span>
                Created by
                {#if creationUsername === null}
                    Unknown User
                {:else}
                    {#await creationUsername}
                        Loading user...
                    {:then name}
                        {name ?? "Unknown User"}
                    {/await}
                {/if}
                on {new Date(card.created).toLocaleString()}
            </span>
            <span>Last updated {new Date(card.updated).toLocaleString()}</span>
            {#if card.moved_at}
                <span>Moved sections at {new Date(card.moved_at).toLocaleString()}</span>
            {/if}
        </div>
    {/if}
    
    <button onclick={deleteCard} class="delete"><Trash /> Delete Card</button>
</footer>

<style lang="scss">
footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .metadata {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);
        white-space: nowrap;
        // yeah, this just overflows. we go with it.
        max-width: 50%;
    }
    button.delete {
        color: var(--error);
        --bg-color: transparent;
        padding: 0.5rem 1rem;
    }
}
</style>