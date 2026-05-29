<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import { getProjectContext, setBoardContext, watchBoard, watchCards, type BoardContext } from "../../context";
    
    const {
        children
    }: {
        children: Snippet
    } = $props();

    const boardId = $derived(page.params.boardId);

    let boardContext = $state<BoardContext>({ board: null, cards: null });
    setBoardContext(boardContext);

    const board = $derived(boardId ? await watchBoard(boardId).catch((err) => {
        console.error("Failed to load board:", err);
        return null;
    }) : null);

    const cards = $derived($board ? await watchCards($board.id).catch((err) => {
        console.error("Failed to load cards:", err);
        return null;
    }) : null);

    $effect(() => {
        boardContext.board = board;
        boardContext.cards = cards;
    });
</script>

{@render children()}