<script lang="ts">
    import { Collections, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import Modal from "../Modal.svelte";
    import { type TypedCardPreviewResponse } from "$lib/data/kanban";
    import { authModel } from "$lib/pocketbase/auth";
    import CardView from "./cardView/CardView.svelte";
    import type { TypedBoardsResponse } from "$lib/data/project";
    import { save, type ExpandResponse } from "$lib/pocketbase";
    import { setUploadContext, type UploadContext } from "./cardView/CardViewPanel.svelte";
    import { Plus, X } from "lucide-svelte";
    import type { TypedCardsCreate } from "$lib/data/cards";

    let {
        board,
        sections,
        subprojects,
        boardCards
    }: {
        board: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        sections: SectionsRecord[],
        subprojects: SubprojectsRecord[],
        boardCards: TypedCardPreviewResponse[],
    } = $props();

    let modal: Modal;
    async function create() {
        if(cardData.title.length === 0) return;

        await save(Collections.Cards, cardData, { create: true }).catch((err) => {
            console.error("Failed to create card:", err);
            return null;
        });

        modal.close();
    }

    function getDefaultCardData(): TypedCardsCreate {
        return {
            assignment_data: null,
            board: board.id,
            created_by: $authModel?.id ?? "",
            dependencies: [],
            description: "",
            due_by: "",
            duration_days: 0,
            files: [],
            metadata: null,
            position: 0,
            priority: "low",
            section: sections[0].id,
            subprojects: [],
            title: "New card"
        };
    }
    
    let cardData = $state<TypedCardsCreate>(getDefaultCardData());

    export function open(defaultSectionId?: string) {
        cardData = getDefaultCardData();
        cardData.section = defaultSectionId ?? sections[0]?.id ?? "";
        modal.open();
    }

    let uploadContext: UploadContext = {
        queueUpload(name: string, file: File) {
            const namedFile = new File([file], name, { type: file.type, lastModified: file.lastModified });
            cardData.files!.push(namedFile);
        },
        update() {}
    };
    setUploadContext(uploadContext);
</script>

<Modal id="new-card" bind:this={modal} class={$css("modal")}>
    {#snippet children({ close })}
        <div class="content">
            <CardView
                {board}
                {subprojects}
                {boardCards}
                loading={false}
                bind:card={cardData}
                autofocusTitle

                allowSelectingDependencies={false}
            />
        </div>
        <div class="buttons">
            <button onclick={close}><X /> Cancel</button>
            <button type="submit" disabled={cardData.title.length === 0} onclick={create}><Plus /> Create</button>
        </div>
    {/snippet}
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

.content {
    overflow-y: auto;
}
.buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}
</style>