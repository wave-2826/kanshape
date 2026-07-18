<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import type { AssemblyData, TypedPartsResponse } from "$lib/data/parts";
    import { getPartHeuristics, type PartHeuristicsResult } from "$lib/onshape/partHeuristics";
    import { client, deleteRecord, query, save, watchOne } from "$lib/pocketbase";
    import { Collections, type PartsResponse } from "$lib/pocketbase/generated-types";
    import { deasyncify } from "$lib/util";
    import { Sparkles } from "lucide-svelte";
    import PopoverButton from "../PopoverButton.svelte";
    import CardPartModal from "./CardPartModal.svelte";
    import PartPreviewRenderer from "./PartPreviewRenderer.svelte";

    let {
        value = $bindable(),
        cardId
    }: {
        value: string | null | undefined;
        cardId: string;
    } = $props();

    const hasValue = $derived(value !== null && value !== undefined && value !== "");
    let part = $state<TypedPartsResponse | null>(null);
    $effect(() => {
        if(hasValue) {
            const store = deasyncify(watchOne(Collections.Parts, value!));
            const unsub = store.subscribe((v) => {
                part = v as TypedPartsResponse | null;
            });
            return () => unsub();
        }
    });

    const onshapeCtx = getOnshapeContext();
    
    // TODO: all the alerts in here should be error popups in the UI instead of alert()
    async function getPartSelection(): Promise<{
        wvm: "w" | "v" | "m";
        type: "part" | "assembly";
        wvmId: string;
        documentId: string;
        elementId: string;
        partId?: string;
        configuration: string;
    } | null> {
        if(onshapeCtx.location === "right-panel-part-studio" || onshapeCtx.location === "right-panel-assembly") {
            const selections = await onshapeCtx.client?.requestSelection("Select a part to create a card for.", ["BODY"]);
            return selections && selections.length > 0 ? {
                wvm: onshapeCtx.wvm ?? "w",
                type: "part",
                wvmId: onshapeCtx.wvmId ?? "",
                documentId: onshapeCtx.documentId ?? "",
                elementId: onshapeCtx.partStudioId ?? "",
                partId: selections[0].selectionId,
                configuration: "default"
            } : null;
        } else if(onshapeCtx.location === "tab") {
            const selection = await onshapeCtx.client?.openSelectItemDialog({
                dialogTitle: "Select a part to create a card for.",
                selectParts: true,
                selectAssemblies: true
            });
            if(!selection) return null;
            console.log("Onshape selection:", selection);

            // sanity checks
            if(selection.isSurface) {
                alert("Please select a part, not a surface.");
                return null;
            }
            // meshes are okay
            if(selection.isFlattenedBody) {
                alert("Please select a part, not a flattened body.");
                return null;
            }
            if(selection.isComposite) {
                // probably fine. uh, maybe
            }
            if((selection.elementType !== "partstudio" || !selection.elementId) && selection.elementType !== "assembly") {
                alert("Please select a part from a part studio or assembly.");
                return null;
            }
            if(selection.itemType !== "part" && selection.itemType !== "assembly") {
                alert("Please select a part or assembly, not a part studio.");
                return null;
            }

            let documentId = selection.documentId;
            if(!documentId) {
                alert("No document found for selected part.");
                return null;
            }

            let elementId = selection.elementId;
            if(!elementId) {
                alert("No part studio or assembly found for selected item.");
                return null;
            }

            let partId = selection.idTag;
            if(selection.itemType === "part" && !partId) {
                alert("No part found for selected part (???).");
                return null;
            }

            let workspaceId = selection.workspaceId;
            let versionId = selection.versionId;
            if(!workspaceId && !versionId) {
                alert("No workspace or version found for selected part.");
                return null;
            }

            let wvm: "w" | "v" | "m" = "w";
            let wvmId = workspaceId || versionId;
            if(wvmId === versionId) wvm = "v";

            return {
                type: selection.elementType === "partstudio" ? "part" : "assembly",
                wvm,
                wvmId,
                documentId,
                elementId,
                partId,
                configuration: selection.elementConfiguration || "default"
            };
        }
        return null;
    }

    async function addPart() {
        if(!onshapeCtx.client) return;

        // TOOD: check for an existing part immediately and prompt the user to update it
        // TODO: better feedback for this loading state
        const sel = await getPartSelection();
        if(!sel) return;

        console.log("Selected part:", sel);

        let existing = await query(Collections.Parts, {
            filter: 
                (sel.type === "part" ?
                    `type="part" && part_id="${sel.partId}"` :
                    `type="assembly"`)
                + `&& document_id="${sel.documentId}" && element_id="${sel.elementId}" && wvm="${sel.wvm}" && wvm_id="${sel.wvmId}"`
                + (sel.configuration !== "default" ? ` && configuration="${sel.configuration}"` : "")
        }).catch(() => null);

        // Run part heuristics
        let partData: PartHeuristicsResult | AssemblyData;
        if(sel.type === "part" && sel.partId) {
            const heuristics = await getPartHeuristics(onshapeCtx.client, sel.documentId, sel.wvm, sel.wvmId, sel.elementId, sel.partId);
            if(!heuristics || "error" in heuristics) {
                alert(`Failed to gather part heuristics: ${
                    heuristics && "error" in heuristics ? heuristics.error : "Unknown error"
                }. Please try again.`);
                return;
            }
            partData = heuristics;

            sel.partId = heuristics.partID ?? sel.partId; // in case the original was a child entity
    
            // check again after heuristic id detection
            if(!existing || existing.length === 0) existing = await query(Collections.Parts, {
                filter: `type="part" && part_id="${sel.partId}" && document_id="${sel.documentId}" && element_id="${sel.elementId}" && wvm="${sel.wvm}" && wvm_id="${sel.wvmId}"`
            }).catch(() => null);
    
            console.log("Existing parts in database:", existing);
        } else {
            const { data, error } = await onshapeCtx.client.requests.GET("/metadata/d/{did}/{wvm}/{wvmid}/e/{eid}", {
                params: {
                    path: {
                        did: sel.documentId,
                        wvm: sel.wvm,
                        wvmid: sel.wvmId,
                        eid: sel.elementId
                    },
                    query: {
                        inferMetadataOwner: false,
                        depth: "1",
                        includeComputedProperties: true,
                        includeComputedAssemblyProperties: false,
                        thumbnail: false,
                        configuration: sel.configuration
                    }
                }
            });

            if(!data) {
                alert(`Failed to fetch assembly metadata: ${error ?? "Unknown error"}. Please try again.`);
                return;
            }

            let name = data.properties?.find(p => p.name === "Name" && p.value)?.value as string | undefined;
            let part_number = data.properties?.find(p => p.name === "Part number" && p.value)?.value as string | undefined;

            partData = {
                name: name ?? "Unknown assembly",
                part_number: part_number ?? ""
            };
        }

        let record: PartsResponse | null = null;
        if(existing && existing.length > 0) {
            // if there are more than 1 existing parts, delete all except the first (which we'll update)
            // this shouldn't really happen but can if configuration information changes
            if(existing.length > 1) {
                console.log(`Deleting ${existing.length - 1} extra existing part records`);
                for(let i = 1; i < existing.length; i++) {
                    await deleteRecord(Collections.Parts, existing[i].id).catch(() => null);
                }
            }

            // Update the existing record
            let past_revision_cards = existing[0].past_revision_cards;
            if(existing[0].current_card != cardId && !past_revision_cards.includes(existing[0].current_card)) {
                past_revision_cards = [...past_revision_cards, existing[0].current_card];
            }
            record = await save(Collections.Parts, {
                id: existing[0].id,
                part_id: sel.partId,
                document_id: sel.documentId,
                element_id: sel.elementId,
                wvm: sel.wvm,
                wvm_id: sel.wvmId,
                current_card: cardId,
                part_data: partData,
                past_revision_cards,
                configuration: sel.configuration,
                revision: existing[0].revision + 1
            }, { create: false });
        } else {
            // Create a new record
            record = await save(Collections.Parts, {
                part_id: sel.partId,
                document_id: sel.documentId,
                element_id: sel.elementId,
                wvm: sel.wvm,
                wvm_id: sel.wvmId,
                current_card: cardId,
                part_data: partData,
                past_revision_cards: [],
                configuration: sel.configuration,
                revision: 1,
                type: sel.type
            }, { create: true });
        }

        if(!record) {
            alert("Failed to save part. Please try again.");
            return;
        }

        console.log("Saved part to database:", record);

        // regenerate the preview
        client.send("/api/parts/generate_preview", {
            method: "POST",
            body: JSON.stringify({ part_id: record.id })
        });

        value = record.id;
        part = record as TypedPartsResponse | null; // early update
    }

    let modal: CardPartModal | null = $state(null);
</script>

{#if hasValue}
    {#if part !== null}
        <CardPartModal {part} bind:this={modal} />

        <button class="part" onclick={(e) => {
            if(e.target instanceof HTMLElement && (
                e.target.closest("[data-part-preview]") || e.target.closest("button") !== e.currentTarget
            )) return;
            modal?.open();
        }}>
            <span class="part-type">{part.type === "part" ? "Part" : "Assembly"}</span>
            <div class="preview" data-part-preview>
                <!-- holy fetch waterfall -->
                <PartPreviewRenderer {part} edges={false} />
            </div>
            <span class="part-name">{part.part_data?.name ?? "Unknown"}</span>
            <span class="part-number">{part.part_data?.part_number ?? ""}</span>
            {#if part.type === "part"}
                <PopoverButton class={$css("heuristic-result")}>
                    {#snippet content()}
                        <p>Heuristic result</p>
                    {/snippet}
                    <Sparkles />
                    Detected as plate
                </PopoverButton>
            {/if}
            <span class="part-id">{part.part_id}</span>
        </button>
    {:else}
        <div class="part missing">Loading part...</div>
    {/if}
{:else}
    {#if onshapeCtx.onOnshape}
        <button class="add" onclick={addPart}>
            + Add part
            <!-- TODO: we can store this ourselves -->
            <img src="https://www.google.com/s2/favicons?domain=onshape.com&sz=32" alt="Onshape" width="16" height="16" />
        </button>
    {:else}
        <!-- TODO: allow selecting existing parts -->
        <!-- svelte-ignore a11y_no_static_element_interactions - for testing -->
        <div class="add missing" ondblclick={() => {
            const id = prompt("Enter part ID to link to this card:");
            if(id) value = id;
        }}>No part selected. Add one from Onshape!</div>
    {/if}
{/if}

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "../kanban/cardView/props.scss";

.add {
    gap: 0.5rem;
}
.add.missing {
    color: var(--text-tertiary);
    font-size: var(--font-small);
}

.part {
    display: grid;
    grid-template-rows: 1.25rem 1rem 1rem 0.25rem; // ""padding""
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
        "preview type type"
        "preview name name"
        "preview number id"
        "preview . .";
    gap: 0.25rem 0.5rem;
    position: relative;

    text-align: left;
    
    background-color: var(--bg-secondary);
    border-radius: 4px;
    width: 100%;
    overflow: hidden;
    padding: 0 1rem 0 0;
    
    .preview {
        grid-area: preview;
        height: 100%;
        aspect-ratio: 1 / 1;
    }

    .part-type {
        grid-area: type;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);
        align-self: end;
    }
    .part-name {
        grid-area: name;
        font-weight: bold;
    }
    .part-number {
        grid-area: number;
        font-size: var(--font-small);
        color: var(--text-secondary);
    }
    .part-id {
        grid-area: id;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);
    }

    .expand-preview {
        --bg-color: var(--bg-primary);
        padding: 0.25rem;
        opacity: 0;
        translate: 0 -0.25rem;
        transition: opacity 0.2s ease, translate 0.2s ease, transform 0.2s ease;

        position: absolute;
        top: 0.25rem;
        left: 0.25rem;
    }
    .preview:hover + .expand-preview, .expand-preview:hover {
        opacity: 1;
        translate: 0 0;
    }

    .heuristic-result {
        --bg-color: var(--success);
    }
}
</style>