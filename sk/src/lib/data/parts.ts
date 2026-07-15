import type { PartHeuristicsResult } from "$lib/onshape/partHeuristics";
import type { PartsResponse } from "$lib/pocketbase/generated-types";

export type TypedPartsResponse = PartsResponse<PartHeuristicsResult>;