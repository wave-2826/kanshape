import type { PartHeuristicsResult } from "$lib/onshape/partHeuristics";
import type { PartsResponse } from "$lib/pocketbase/generated-types";

/**
 * Data for an assembly stored in the part data.  
 * Note that this doesn't store preview information like specific parts; only broad metadata.
 */
type AssemblyData = {
    
};

export type TypedPartsResponse = PartsResponse<PartHeuristicsResult | AssemblyData>;