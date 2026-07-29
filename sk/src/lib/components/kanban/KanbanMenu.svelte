<script lang="ts">
    import { Funnel, SquarePlus, View } from "lucide-svelte";
    import NewCardModal from "./NewCardModal.svelte";
    import type { ExpandResponse } from "$lib/pocketbase";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import type { TypedBoardsResponse } from "$lib/data/project";

    const {
        project,
        board,
        cards
    }: {
        project: ExpandResponse<"projects", "subprojects">,
        board?: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        cards?: TypedCardPreviewResponse[]
    } = $props();

    let newCardModal: NewCardModal | null = $state(null);

    const sections = $derived(board?.expand.sections ?? []);

    export function openNewCardModal(defaultSectionId?: string) {
        newCardModal?.open(defaultSectionId);
    }
</script>

<menu>
    {#if sections}
        <button onclick={() => newCardModal?.open()} disabled={sections.length === 0} class="new">
            <SquarePlus />
            New Card
        </button>
    {/if}
    <button disabled onclick={() => {
        // todo
    }}>
        <Funnel />
        Filter
    </button>
    <button disabled onclick={() => {
        // todo
    }}>
        <View />
        View
    </button>
    <input type="text" placeholder="Search cards..." disabled />
</menu>

{#if board && sections && cards}
    <NewCardModal
        bind:this={newCardModal}
        subprojects={project.expand.subprojects ?? []}
        boardCards={cards} {board}
    />
{/if}

<style lang="scss">
menu {
    background-color: var(--bg-primary);
    padding: 0.25rem;
    border-radius: 4px;
    margin: 0 0.5rem;

    display: flex;
    flex-direction: row;
    gap: 0.5rem;

    white-space: nowrap;
    overflow-x: auto;
    flex-shrink: 0;

    input {
        padding: 0 0.5rem;
        width: 200px;
    }
}
</style>