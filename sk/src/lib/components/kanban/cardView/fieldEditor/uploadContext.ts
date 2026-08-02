import { createContext } from "svelte";
import { type TypedCardsResponse } from "../../../../data/cards";
import type { TypedCardPreviewResponse } from "$lib/data/kanban";
import type { TypedPartsResponse } from "$lib/data/parts";
import type { CreationPart } from "$lib/components/parts/partData";
import type { MetadataFile } from "$lib/data/metadata";

// todo: there's probably a better place for this type
// also todo: this could be cleaned up with a more general context passing information down instead of callbacks
export type UploadContext = {
    queueUpload(name: string, file: File): void;
    update(): void;
    getFileUrl?(file: MetadataFile): string;
    /** Whether the card currently has the given file */
    hasFile(file: MetadataFile): boolean;

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