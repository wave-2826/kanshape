import { save, type ExpandResponse } from "$lib/pocketbase";
import { CardsPriorityOptions, Collections, type CardPreviewResponse, type CardsResponse, type IsoAutoDateString } from "$lib/pocketbase/generated-types";
import type { CardAssignmentData } from "./cards";

type NonNullValuesExcept<T, K extends keyof T> = {
    [P in keyof T]: P extends K ? T[P] : NonNullable<T[P]>;
};
export type TypedCardPreviewResponse = NonNullValuesExcept<CardPreviewResponse<
    CardAssignmentData, // assignment_data
    string[], // assignment_name_cache
    IsoAutoDateString, // created
    string, // created_by
    string, // description (truncated)
    string, // due_by
    string, // moved_at
    number, // position
    CardsPriorityOptions, // priority
    string, // project
    string, // section
    string, // subproject
    string, // title
    IsoAutoDateString, // updated
    {} // expand
>, "assignment_data" | "assignment_name_cache">;

export function sortCards<CardType extends TypedCardPreviewResponse>(list: CardType[]): CardType[] {
    return [...list].sort((left, right) => {
        const positionDelta = (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER);
        if(positionDelta !== 0) return positionDelta;
        return left.created.localeCompare(right.created);
    });
}

export function positionBetween(previousPosition: number | null | undefined, nextPosition: number | null | undefined) {
    if(previousPosition === undefined || previousPosition === null) {
        return (nextPosition ?? 0) - 1000;
    }

    if(nextPosition === undefined || nextPosition === null) {
        return previousPosition + 1000;
    }

    const midpoint = (previousPosition + nextPosition) / 2;
    if(midpoint === previousPosition || midpoint === nextPosition) {
        return previousPosition + 0.5;
    }

    return midpoint;
}

export function nextCardPosition(boardCards: TypedCardPreviewResponse[], sectionId: string) {
    const positions = boardCards
        .filter((card) => card.section === sectionId)
        .map((card) => card.position ?? 0);
    return (positions.length > 0 ? Math.max(...positions) : 0) + 1000;
}

export async function moveCard(
    boardCards: TypedCardPreviewResponse[],
    cardId: string, sectionId: string,
    beforeCardId: string | "last" | "first" | null = "first"
): Promise<TypedCardPreviewResponse[]> {
    const card = boardCards.find((entry) => entry.id === cardId);
    if(!card) return boardCards;

    const sectionCards = sortCards(boardCards.filter((entry) => entry.section === sectionId && entry.id !== cardId));

    if(beforeCardId === "last") beforeCardId = null;
    if(beforeCardId === "first") beforeCardId = sectionCards[0]?.id ?? null;
    const targetIndex = beforeCardId ? sectionCards.findIndex((entry) => entry.id === beforeCardId) : -1;
    const targetPosition = targetIndex >= 0
        ? positionBetween(sectionCards[targetIndex - 1]?.position, sectionCards[targetIndex]?.position)
        : nextCardPosition(boardCards, sectionId);

    if(card.section === sectionId && beforeCardId === card.id) return boardCards;

    function constructPreview(fullCard: CardsResponse): TypedCardPreviewResponse {
        // Shouldn't change; if it does, we'll get a new value anyway
        const oldNameCache = card!.assignment_name_cache;
        return {
            ...fullCard,
            description: fullCard.description ? fullCard.description.substring(0, 100) : "",
            assignment_name_cache: oldNameCache,
            assignment_data: fullCard.assignment_data as CardAssignmentData,
            expand: {}
        };
    }

    const changedSections = card.section !== sectionId;
    const savedCard = await save(Collections.Cards, {
        id: card.id,
        section: sectionId,
        position: targetPosition,
        moved_at: changedSections ? new Date().toISOString() : undefined
    }, { create: false }).catch((err) => {
        console.error("Failed to move card:", err);
        return null;
    });

    if(!savedCard) return boardCards;

    // Early local update
    card.section = sectionId;
    card.position = targetPosition;
    boardCards = sortCards([
        ...boardCards.filter((entry) => entry.id !== savedCard.id),
        constructPreview(savedCard)
    ]);
    return boardCards;
}