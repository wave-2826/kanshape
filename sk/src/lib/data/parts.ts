import type { PartHeuristicsResult } from "$lib/onshape/partHeuristics";
import type { PartCardsResponse, PartsResponse } from "$lib/pocketbase/generated-types";
import type { CardAssignmentData } from "./cards";
import type { NonNullValuesExcept } from "./kanban";

export type TypedPartCardsResponse = NonNullValuesExcept<PartCardsResponse<
    CardAssignmentData, // assignment_data
    string[], // assignment_name_cache
    string, // description (truncated)
    { id: string, name: string }[], // subprojects
    {} // expand
>, "assignment_data" | "assignment_name_cache">;

/**
 * Data for an assembly stored in the part data.  
 * Note that this doesn't store preview information like specific parts; only broad metadata.
 */
export type AssemblyData = {
    name: string;
    part_number: string;
};

/**
 * Data for a part stored in the part data.
 * Simply contains the result of part heuristics and an optional type override.
 */
export type PartData = PartHeuristicsResult & {
    override?: {
        partType: PartHeuristicsResult["heuristic"]["partType"]
    }
};

export type TypedPartsResponse = PartsResponse<PartData | AssemblyData>;

export type PartExportType = "step" | "dxf" | "gltf" | "obj";
export const partExportTypes: {
    [key in PartExportType]: { name: string; extension: string; canBeAssembly: boolean }
} = {
    "step": { name: "STEP", extension: ".step", canBeAssembly: true },
    "dxf": { name: "DXF", extension: ".dxf", canBeAssembly: false },
    "gltf": { name: "glTF", extension: ".gltf", canBeAssembly: true },
    "obj": { name: "OBJ", extension: ".obj.zip", canBeAssembly: true }
};

export type PartExport = {
    type: PartExportType,
    partRecordId: string,
    cardId?: string,
    id: string
};
