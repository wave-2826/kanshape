import heuristicScript from "./partHeuristics.fs?raw";
import { evalTemplatedFS } from "./featureScript";

export type PartHeuristicsResult = {
    partID: string;
    name: string;
    material: {
        density?: number;
        name?: string;
    } | undefined;
    appearance: string | undefined;
    description: string | undefined;
    part_number: string | undefined;
    revision: string | undefined;
    heuristic: {
        partType: "shaft" | "plate" | "tube" | "unknown";
        size: [number, number];
        thickness: number;
        confidence: number;
    }
};

export async function getPartHeuristics(
    documentId: string, wvm: "w" | "v" | "m", wvmId: string, partStudioId: string,
    transientSelectionID: string
): Promise<PartHeuristicsResult | null> {
    return await evalTemplatedFS<PartHeuristicsResult>(
        heuristicScript, {
            selectionID: transientSelectionID
        },
        documentId, wvm, wvmId, partStudioId,
    );
}