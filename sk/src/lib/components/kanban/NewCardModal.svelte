<script lang="ts">
    import { type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import Modal from "../Modal.svelte";
    import { type TypedCardPreviewResponse } from "$lib/data/kanban";
    import type { TypedBoardsResponse } from "$lib/data/project";
    import { type ExpandResponse } from "$lib/pocketbase";
    import { X } from "@lucide/svelte";
    import NewCardView from "./NewCardView.svelte";

    let {
        board,
        subprojects,
        boardCards
    }: {
        board: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        subprojects: SubprojectsRecord[],
        boardCards: TypedCardPreviewResponse[],
    } = $props();

    let modal: Modal;

    let defaultSectionId: string | null = null;
    export function open(section?: string) {
        defaultSectionId = section ?? null;
        
        modal.open();
    }
</script>

<Modal id="new-card" bind:this={modal} class={$css("modal")}>
    <NewCardView
        {board}
        {subprojects}
        {boardCards}
        onopen={(card) => {
            if(defaultSectionId) card.section = defaultSectionId;
            return card;
        }}
        oncreate={() => {
            modal.close();
        }}
    >
        {#snippet buttons()}
            <button onclick={() => modal.close()}><X /> Cancel</button>
        {/snippet}
    </NewCardView>
</Modal>

<style lang="scss">
.modal {
    padding: 1rem;
    width: calc(min(100%, 800px) - 2rem);
    max-height: calc(min(90%, 800px) - 2rem);
    gap: 0.5rem;

    display: flex;
    flex-direction: column;
}
</style>