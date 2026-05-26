<script lang="ts">
    import { Funnel, SquarePlus, View } from "lucide-svelte";
    import NewCardModal from "./NewCardModal.svelte";
    import type { TypedCardPreviewResponse } from "./kanban";
    import type { ExpandResponse } from "$lib/pocketbase";
    import type { SectionsRecord } from "$lib/pocketbase/generated-types";

    const {
        project,
        sections,
        cards
    }: {
        project: ExpandResponse<"projects", "subprojects,sections"> | null,
        sections: SectionsRecord[],
        cards: TypedCardPreviewResponse[]
    } = $props();

    let newCardModal: NewCardModal | null = $state(null);

    export function openNewCardModal(defaultSectionId?: string) {
        newCardModal?.open(defaultSectionId);
    }
</script>

{#if project}
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

    <NewCardModal bind:this={newCardModal} {sections} boardCards={cards} projectId={project.id} />
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