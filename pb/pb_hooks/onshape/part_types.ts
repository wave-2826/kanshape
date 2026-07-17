import { components } from "../../../sk/src/lib/onshape/schema";

import { PartModelHeader, AssemblyModelHeader } from "../../../sk/src/lib/components/parts/renderer";
export type { PartModelHeader, AssemblyModelHeader };

export type _schemas = components["schemas"];

export type DeepRequired<T> = T extends object ? { [K in keyof T]-?: DeepRequired<T[K]> } : T;

export type BTAssemblyDefinitionInfo = _schemas["BTAssemblyDefinitionInfo"];
export type BTAssemblyInstanceInfo = _schemas["BTAssemblyInstanceInfo"];
export type BTExportTessellatedFacesBody = _schemas["BTExportTessellatedFacesBody-1321"];
export type BTExportTessellatedFacesResponse = DeepRequired<
    Omit<_schemas["BTExportTessellatedFacesResponse-898"], "bodies"> & {
        bodies: BTExportTessellatedFacesBody[]; // onshape types don't use the right one ??
    }>;

// shared PB -> node types

/**
 * row-major 4x4 affine transformation matrix representation
 */
export type TransformMatrix4x4 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
];

/** Data for an extracted set of parts in an assembly. */
export type PartGroup = {
    documentId: string;
    elementId: string;
    documentMicroversion: string;
    partId: string;
    
    /** defaults to "default" */
    configuration: string;
    /** the downloaded part face data file */
    file?: string;
    transformations: TransformMatrix4x4[];
};
/** Assembly data */
export type AssemblyData = {
    type: "assembly";
    parts: PartGroup[];
};