import { createContext } from "svelte";
import { type TypedCardsResponse } from "../../../../data/cards";
import type { TypedCardPreviewResponse } from "$lib/data/kanban";
import type { MetadataFile } from "$lib/data/project";
import type { TypedPartsResponse } from "$lib/data/parts";
import type { CreationPart } from "$lib/components/parts/partData";

// todo: there's probably a better place for this type
export type UploadContext = {
    queueUpload(name: string, file: File): void;
    update(): void;
    getFileUrl?(file: MetadataFile): string;

    /**
     * only set if on a parts board.
     */
    partExport?: {
        /** The ID of the card being edited, or null if one is being created. */
        cardId: string | null;

        /**
         * get all parts that can be exported for this card. async since we need to fetch them
         * (technically we don't since we already fetch all of them but uh. caching is annoying)
         * TODO: yeah that
         */
        getParts(): Promise<(TypedPartsResponse | CreationPart)[]>;
        /**
         * if there are any parts currently added to the card
         */
        hasParts(): boolean;
    }
};
export const [getUploadContext, setUploadContext] = createContext<UploadContext>();

export type CardSelectState = {
    message: string;
    callback: (selected: TypedCardPreviewResponse, self: TypedCardsResponse) => void;
    originalSelection: string;
};