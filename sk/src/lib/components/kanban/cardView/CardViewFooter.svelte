<script lang="ts">
    import type { TypedCardsResponse } from "$lib/data/cards";
    import { deleteRecord, queryOne } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { Trash } from "lucide-svelte";
    import { getUsername } from "./nameCache";

    const { card }: { card: TypedCardsResponse } = $props();

    function deleteCard() {
        const id = card.id;
        if(!id) return;
        deleteRecord(Collections.Cards, id);
    }

    const creationUsername = $derived(card?.created_by ? getUsername(card.created_by) : null);
</script>

<footer>
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
        <span>Moved sections at {new Date(card.moved_at).toLocaleString()}</span>
    </div>
    
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