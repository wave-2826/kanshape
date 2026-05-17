import type { CardsResponse } from "$lib/pocketbase/generated-types";

export function sortCards(list: CardsResponse[]) {
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
