<!--
    A wrapper for CardViewPanel that fetches the board and other necessary cards instead of depending on a
    parent board already being known. Used when displaying cards from various board (e.g. subprojects and
    the onshape view)
-->

<script lang="ts">
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import { queryOne, watchOne, type ExpandResponse } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { deasyncify } from "$lib/util";
    import { untrack } from "svelte";
    import CardViewPanel from "./CardViewPanel.svelte";
    import type { OpenCardState } from "./state.svelte";
    import { nav } from "$lib/navigation";

    const {
        openCardId,
        cards,
        project
    }: {
        openCardId: OpenCardState,
        /**
         * The cards associated with whatever this card was found in; just needs to be an array that
         * might have the open card in it. If the user opens a card not in this array, we redirect elsewhere.
         */
        cards: TypedCardPreviewResponse[] | null,
        project: ExpandResponse<"projects", "subprojects"> | null
    } = $props();

    // We don't use derived here because we don't want to refresh the card when it changes externaloly.
    let openCard = $state<TypedCardPreviewResponse | null>(null);
    $effect.pre(() => {
        if(!openCardId.cardId || !cards) {
            openCard = null;
            return;
        }
        const cardItem = cards.find((c) => c.id === openCardId.cardId);
        if(cardItem && untrack(() => cardItem.id !== openCard?.id)) {
            openCard = cardItem;
        }
    });

    const openCardBoard = $derived(openCard ? deasyncify(watchOne(Collections.Boards, openCard.board, {
        expand: "sections"
    })) : null);
</script>

<CardViewPanel
    board={$openCardBoard ?? undefined}
    cards={cards ?? undefined}
    card={$openCardBoard ? openCardId.withBeforeSet((id) => {
        console.log("Selected ", id);

        if(!cards) return true;

        const fullCard = cards.find((c) => c.id === id);
        if(id && project && !fullCard) {
            console.log("Card not found in this view, redirecting to card page");
            
            (async () => {
                // this isn't ideal but oh well
                const newCard = await queryOne(Collections.Cards, id);
                // this card is from another subproject; open its board
                if(newCard) nav(`/projects/${project.id}/boards/${newCard.board}?card=${id}`);
            })();

            return false;
        }

        return true;
    }) : null}
    subprojects={project?.expand.subprojects ?? []}
    projectId={project?.id ?? ""}
/>