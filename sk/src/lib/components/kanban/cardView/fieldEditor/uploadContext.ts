import { createContext } from "svelte";
import { type TypedCardsResponse } from "../../../../data/cards";
import type { TypedCardPreviewResponse } from "$lib/data/kanban";
import type { MetadataFile, PartExportType } from "$lib/data/project";
import type { TypedPartsResponse } from "$lib/data/parts";

// todo: there's probably a better place for this type
export type UploadContext = {
    queueUpload(name: string, file: File): void;
    update(): void;
    getFileUrl?(file: MetadataFile): string;

    /**
     * only set if on a parts board.
     */
    partExport?: {
        /**
         * get all parts that can be exported for this card.
         */
        getParts(): Promise<TypedPartsResponse[]>;
        /**
         * upload a type of file based on the given part.
         */
        queuePartExport(name: string, partRecord: string, type: PartExportType): void;
    }
};
export const [getUploadContext, setUploadContext] = createContext<UploadContext>();

export type CardSelectState = {
    message: string;
    callback: (selected: TypedCardPreviewResponse, self: TypedCardsResponse) => void;
    originalSelection: string;
};