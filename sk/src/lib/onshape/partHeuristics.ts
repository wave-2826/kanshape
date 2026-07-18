import heuristicScript from "./partHeuristics.fs?raw";
import { evalTemplatedFS } from "./featureScript";
import type { OnshapeClient } from "./client";

export type PartHeuristicsResult = {
    partID: string;
    name: string;
    material: {
        /** kg/m^3 */
        density?: number;
        name?: string;
    } | undefined;
    /** all components [0, 1] */
    appearance: {
        alpha?: number;
        red?: number;
        green?: number;
        blue?: number;
    } | undefined;
    description: string | undefined;
    part_number: string | undefined;
    revision: string | undefined;
    heuristic: {
        partType: "shaft" | "plate" | "tube" | "unknown";
        size: [number, number];
        thickness: number;
        confidence: number;
    };
    aabb: {
        min: [number, number, number];
        max: [number, number, number];
    };
};

export function appearanceToHex(appearance: PartHeuristicsResult["appearance"]): string | undefined {
    if (!appearance) return undefined;
    const { red, green, blue, alpha } = appearance;
    if (red === undefined || green === undefined || blue === undefined) return undefined;
    const r = Math.round(red * 255);
    const g = Math.round(green * 255);
    const b = Math.round(blue * 255);
    const a = alpha !== undefined ? Math.round(alpha * 255) : 255;
    return `#${
        r.toString(16).padStart(2, "0")
    }${
        g.toString(16).padStart(2, "0")
    }${
        b.toString(16).padStart(2, "0")
    }${
        a !== 255 ? a.toString(16).padStart(2, "0") : ""
    }`;
}

export async function getPartHeuristics(
    client: OnshapeClient,
    documentId: string, wvm: "w" | "v" | "m", wvmId: string, elementId: string,
    transientSelectionID: string
): Promise<PartHeuristicsResult | null> {
    return await evalTemplatedFS<PartHeuristicsResult>(
        client,
        heuristicScript, {
            selectionID: transientSelectionID
        },
        documentId, wvm, wvmId, elementId,
    );
}