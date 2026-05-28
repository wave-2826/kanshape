<script lang="ts">
    import { Funnel, SquarePlus, View } from "lucide-svelte";
    import NewCardModal from "./NewCardModal.svelte";
    import type { ExpandResponse } from "$lib/pocketbase";
    import type { SectionsRecord } from "$lib/pocketbase/generated-types";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";

    const {
        project,
        board,
        sections,
        cards
    }: {
        project: ExpandResponse<"projects", "subprojects">,
        board: ExpandResponse<"boards", "sections">,
        sections: SectionsRecord[],
        cards: TypedCardPreviewResponse[]
    } = $props();

    let newCardModal: NewCardModal | null = $state(null);

    export function openNewCardModal(defaultSectionId?: string) {
        newCardModal?.open(defaultSectionId);
    }
</script>

    <menu>
    <button onclick={() => newCardModal?.open()} disabled={sections.length === 0} class="new">
        <SquarePlus />
        New Card
    </button>
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

<NewCardModal bind:this={newCardModal} {sections} boardCards={cards} projectId={project.id} boardId={board.id} />

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