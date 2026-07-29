import type { AssemblyData, PartData } from "$lib/data/parts";
import { generateRecordID, type OnshapeClient, type OnshapeSelection } from "$lib/onshape/client";
import { getPartHeuristics } from "$lib/onshape/partHeuristics";
import type { components } from "$lib/onshape/schema";
import type { OnshapeContext } from "../nav/onshapeContext.svelte";

export type PartSelection = {
    wvm: "w" | "v" | "m";
    type: "part" | "assembly";
    wvmId: string;
    documentId: string;
    elementId: string;
    partId?: string;
    configuration: string;
};

/** Data for creating a new part when making a card */
export type CreationPart = {
    // ID not sent to server used for associating parts -> exports. just a random string.
    internalId: string;
    type: "part" | "assembly",
    sel: PartSelection,
    partData: PartData | AssemblyData,
    assemblyData?: BTAssemblyDefinitionInfo
};

type BTAssemblyDefinitionInfo = components["schemas"]["BTAssemblyDefinitionInfo"];
function getSelectionFromAssemblyPath(assembly: BTAssemblyDefinitionInfo, path: string[]): PartSelection | null {
    if(path.length === 0) throw new Error("Path must have at least one item");
    const targetId = path[path.length - 1];
    
    // index root assembly instances
    for(const instance of assembly.rootAssembly.instances) {
        if(instance.id === targetId) {
            return {
                documentId: instance.documentId,
                wvm: "m",
                wvmId: instance.documentMicroversion,
                elementId: instance.elementId,
                type: instance.type === "Part" ? "part" : "assembly",
                partId: instance.partId,
                configuration: instance.configuration || instance.fullConfiguration || "default"
            };
        }
    }
    
    // index sub-assembly instances
    if(assembly.subAssemblies) {
        for(const subAssembly of assembly.subAssemblies) {
            for(const instance of subAssembly.instances) {
                if(instance.id === targetId) {
                    return {
                        documentId: instance.documentId,
                        wvm: "m",
                        wvmId: instance.documentMicroversion,
                        elementId: instance.elementId,
                        type: instance.type === "Part" ? "part" : "assembly",
                        partId: instance.partId,
                        configuration: instance.configuration || instance.fullConfiguration || "default"
                    };
                }
            }
        }
    }

    return null;
}

/** Gets part data from a client messaging selection */
export async function getSelectionCreationData(ctx: OnshapeContext, sel: OnshapeSelection): Promise<CreationPart | null> {
    if(!ctx.client || !ctx.documentId || !ctx.wvm || !ctx.wvmId || !ctx.elementId) {
        throw new Error("Onshape context is not fully initialized");
    }

    const inAssembly = ctx.location === "right-panel-assembly";
    if(inAssembly && !sel.occurrencePath) {
        throw new Error("Expected occurrence path on assembly selection");
    }

    const partSelection: PartSelection = {
        documentId: ctx.documentId,
        wvm: ctx.wvm,
        wvmId: ctx.wvmId,
        elementId: ctx.elementId,
        type: inAssembly ? "assembly" : "part",
        configuration: "default" // again, we don't really get a configuration so who knows
    };

    // if we're in an assembly, we always need to fetch its inforamtion; either:
    // - this is a part (we need to know which one)
    // - this is a subassembly (again, need to know which one)
    // - the root assembly was selected (we need its data anyway)
    if(inAssembly) {
        if(sel.selectionId === "assemblyRoot") {
            // we don't need to fetch full assembly data for the root
            const partData = await getPartData(ctx.client, partSelection);
            if(!partData) return null;
            return {
                internalId: generateRecordID(),
                type: "assembly",
                sel: partSelection,
                partData
            };
        }
        
        const { data: assemblyData, error } = await ctx.client.requests.GET("/assemblies/d/{did}/{wvm}/{wvmid}/e/{eid}", {
            params: {
                path: { did: ctx.documentId, wvm: ctx.wvm, wvmid: ctx.wvmId, eid: ctx.elementId },
                query: {
                    includeMateFeatures: false,
                    includeNonSolids: false,
                    includeMateConnectors: false,
                    excludeSuppressed: true,
                    // we don't set the configuration since we don't get it anywhere. maybe the correct
                    // route is sending a separate request? i'm not sure what onshape even does in the
                    // case of none being provided - does it use the current one set?
                }
            }
        });
        if(!assemblyData) {
            throw new Error(`Failed to fetch assembly metadata: ${error ?? "Unknown error"}`);
        }

        if(!sel.occurrencePath) {
            throw new Error("Expected occurrence path on assembly selection");
        }
        
        const selection = getSelectionFromAssemblyPath(assemblyData, sel.occurrencePath);
        if(!selection) {
            throw new Error("Failed to find selection in assembly metadata");
        }

        const partData = await getPartData(ctx.client, selection, ctx.documentId);
        if(!partData) {
            throw new Error("Failed to get part data");
        }

        if(selection.type === "part") {
            selection.type = "part";
            selection.partId = "partID" in partData ? partData.partID : undefined;
        }

        return {
            internalId: generateRecordID(),
            type: selection.type,
            sel: selection,
            partData,
            assemblyData
        };
    } else {
        // if we're in a part studio, we only need to get the part heuristics if it's a part selection
        // this can be a body OR entity (without an associated part id at first, just a transient id)
        // but we handle them the same by running part heuristics anyway.
        const id = sel.selectionId;
        if(!id) throw new Error("Selection does not have an id");

        const heuristics = await getPartHeuristics(
            ctx.client,
            ctx.documentId, ctx.wvm, ctx.wvmId, ctx.elementId, id
            // again, we don't really get a configuration, so we don't pass it
        );
        if(!heuristics || "error" in heuristics) {
            throw new Error(`Failed to gather part heuristics: ${
                heuristics && "error" in heuristics ? heuristics.error : "Unknown error"
            }`);
        }

        // in case the original was a child entity
        partSelection.partId = heuristics.partID ?? partSelection.partId;

        return {
            internalId: generateRecordID(),
            type: "part",
            sel: partSelection,
            partData: heuristics
        };
    }
}

/** Gets part data from a part selection (not client messaging) */
export async function getPartData(
    client: OnshapeClient, sel: PartSelection, linkDocumentId?: string
): Promise<PartData | AssemblyData | null> {
    if(sel.type === "part" && sel.partId) {
        const heuristics = await getPartHeuristics(
            client,
            sel.documentId, sel.wvm, sel.wvmId, sel.elementId, sel.partId,
            linkDocumentId, sel.configuration
        );
        if(!heuristics || "error" in heuristics) {
            alert(`Failed to gather part heuristics: ${
                heuristics && "error" in heuristics ? heuristics.error : "Unknown error"
            }. Please try again.`);
            return null;
        }
        sel.partId = heuristics.partID ?? sel.partId; // in case the original was a child entity
        return heuristics;
    } else {
        const { data, error } = await client.requests.GET("/metadata/d/{did}/{wvm}/{wvmid}/e/{eid}", {
            params: {
                path: { did: sel.documentId, wvm: sel.wvm, wvmid: sel.wvmId, eid: sel.elementId },
                query: {
                    inferMetadataOwner: false,
                    depth: "1",
                    includeComputedProperties: false,
                    includeComputedAssemblyProperties: false,
                    thumbnail: false,
                    configuration: sel.configuration,
                    linkDocumentId
                }
            }
        });

        if(!data) {
            alert(`Failed to fetch assembly metadata: ${error ?? "Unknown error"}. Please try again.`);
            return null;
        }

        let name = data.properties?.find(p => p.name === "Name" && p.value)?.value as string | undefined;
        let part_number = data.properties?.find(p => p.name === "Part number" && p.value)?.value as string | undefined;

        return {
            name: name ?? "Unknown assembly",
            part_number: part_number ?? ""
        };
    }
}