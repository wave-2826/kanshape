import type { OnshapeDocumentsResponse } from "$lib/pocketbase/generated-types";
import { createContext } from "svelte";

export type OnshapeContext = {
    linkedProject: OnshapeDocumentsResponse | null;
    documentId: string;
};

export const [getOnshapeContext, setOnshapeContext] = createContext<OnshapeContext>();