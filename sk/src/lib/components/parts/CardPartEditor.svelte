<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import type { AssemblyData, TypedPartsResponse } from "$lib/data/parts";
    import { type PartHeuristicsResult } from "$lib/onshape/partHeuristics";
    import { client, deleteRecord, query, save, watchOne } from "$lib/pocketbase";
    import { Collections, type PartsResponse } from "$lib/pocketbase/generated-types";
    import { deasyncify } from "$lib/util";
    import { readable, type Readable } from "svelte/store";
    import CardPart from "./CardPart.svelte";
    import { RefreshCw } from "lucide-svelte";
    import { getPartData, type PartSelection } from "./partData";

    let {
        value = $bindable(),
        cardId
    }: {
        value: string | null | undefined;
        cardId?: string;
    } = $props();

    const hasValue = $derived(value !== null && value !== undefined && value !== "");
    let part = $state<TypedPartsResponse | { error: string } | null>(null);
    $effect(() => {
        if(hasValue) {
            const store = deasyncify(
                (watchOne(Collections.Parts, value!, {
                    requestKey: null
                }) as Promise<Readable<TypedPartsResponse | { error: string } | null>>)
                .catch((e) => {
                    console.error(e);
                    return readable({ error: `Failed to get part with ID ${value}.` });
                })
            );
            const unsub = store.subscribe((v) => {
                part = v;
            });
            return () => unsub();
        }
    });

    let status = $state<"display" | "loading" | "existing" | "error">("display");

    const onshapeCtx = getOnshapeContext();
    
    // TODO: all the alerts in here should be error popups in the UI instead of alert()
    async function getPartSelection(): Promise<PartSelection | null> {
        if(onshapeCtx.location === "right-panel-part-studio" || onshapeCtx.location === "right-panel-assembly") {
            const selections = await onshapeCtx.client?.requestSelection("Select a part to create a card for.", ["BODY"]);
            return selections && selections.length > 0 ? {
                wvm: onshapeCtx.wvm ?? "w",
                type: "part",
                wvmId: onshapeCtx.wvmId ?? "",
                documentId: onshapeCtx.documentId ?? "",
                elementId: onshapeCtx.elementId ?? "",
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

    async function updatePartRecord(
        existing: PartsResponse[] | null,
        sel: PartSelection,
        partData: PartHeuristicsResult | AssemblyData | null
    ): Promise<PartsResponse | null> {
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
                part_data: partData ?? undefined,
                past_revision_cards,
                configuration: sel.configuration,
                revision: existing[0].revision + 1
            }, { create: false });
        } else {
            if(!partData) throw new Error("Part data required for creating new part.");
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
            return null;
        }

        return record;
    }

    async function queryExistingParts(sel: PartSelection) {
        return await query(Collections.Parts, {
            filter: 
                (sel.type === "part" ?
                    `type="part" && part_id="${sel.partId}"` :
                    `type="assembly"`)
                + `&& document_id="${sel.documentId}" && element_id="${sel.elementId}" && wvm="${sel.wvm}" && wvm_id="${sel.wvmId}"`
                + (sel.configuration !== "default" ? ` && configuration="${sel.configuration}"` : "")
        }).catch(() => null);
    }

    async function refreshPart(sel: PartSelection, existing: PartsResponse[] | null) {
        if(!onshapeCtx.client) return;

        // Run part heuristics or collect assembly data
        let partData = await getPartData(onshapeCtx.client, sel);
        if(!partData) return;
        
        if("heuristic" in partData) {
            // check again after heuristic id detection
            if(!existing || existing.length === 0) existing = await query(Collections.Parts, {
                filter: `type="part" && part_id="${sel.partId}" && document_id="${sel.documentId}" && element_id="${sel.elementId}" && wvm="${sel.wvm}" && wvm_id="${sel.wvmId}"`
            }).catch(() => null);
    
            console.log("Existing parts in database:", existing);
        }

        const record = await updatePartRecord(existing, sel, partData);
        if(!record) return;

        status = "display";

        // regenerate the preview
        client.send("/api/parts/generate_preview", {
            method: "POST",
            body: JSON.stringify({ part_id: record.id })
        });

        value = record.id;
        part = record as TypedPartsResponse | null; // early update
    }

    async function addPart() {
        if(!cardId) {
            // temporary until i figure out this handling
            alert("No card ID provided. Cannot add part.");
            return;
        }

        if(status !== "display") return;
        if(!onshapeCtx.client) return;

        const sel = await getPartSelection();
        if(!sel) return;

        status = "loading";

        let existing = await queryExistingParts(sel);
        if(existing && existing.length > 0) {
            status = "existing";

            const record = await updatePartRecord(existing, sel, null);
            if(!record) {
                status = "error";
                return;
            }

            value = record.id;
            part = record as TypedPartsResponse;
            return;
        }

        await refreshPart(sel, existing);
    }
</script>

<!-- holy conditional tree -->
{#if status === "error"}
    <div class="placeholder">
        Error loading part
        <button onclick={() => {
            status = "display";
            part = null;
            value = null;
        }}><RefreshCw /> Retry</button>
    </div>
{:else if status === "loading"}
    <div class="placeholder">Loading part...</div>
{:else}
    {#if hasValue}
        {#if part !== null}
            {#if "error" in part}
                <div class="placeholder">Error loading part: {part.error}</div>
            {:else}
                <div class="part-wrapepr">
                    <CardPart {part} />
                    {#if status === "existing"}
                        <div class="placeholder existing">
                            <span>This part has already been added. Refresh its inforamtion?</span>
                            <button onclick={async () => {
                                if(!part || "error" in part) return;
                                const sel: PartSelection = {
                                    type: part.type,
                                    documentId: part.document_id,
                                    elementId: part.element_id,
                                    configuration: part.configuration,
                                    wvm: part.wvm,
                                    wvmId: part.wvm_id,
                                    partId: part.part_id
                                };
                                status = "loading";
                                let existing = await queryExistingParts(sel);
                                await refreshPart(sel, existing);
                            }}><RefreshCw /> Refresh</button>
                            <button onclick={() => status = "display"}>Close</button>
                        </div>
                    {/if}
                </div>
            {/if}
        {:else}
            <div class="placeholder">Loading part...</div>
        {/if}
    {:else}
        {#if onshapeCtx.onOnshape}
            {#if cardId}
                <button class="add" onclick={addPart}>
                    + Add part
                    <!-- TODO: we can store this ourselves -->
                    <img src="https://www.google.com/s2/favicons?domain=onshape.com&sz=32" alt="Onshape" width="16" height="16" />
                </button>
            {:else}
                <!-- TODO: there are some possible interfaces that could work for this, but right now
                 we don't want to create additional part records before creating a card, so we disallow it.
                 look into storing additional added parts before creation. -->
                <span class="empty">Add additional parts after creating the card.</span>
            {/if}
        {:else}
            <!-- TODO: allow selecting existing parts when not on onshape maybe? -->
            <div class="add empty">No part selected. Add one from Onshape!</div>
        {/if}
    {/if}
{/if}

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "../kanban/cardView/props.scss";

.part-wrapepr {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
}
.placeholder {
    background-color: var(--bg-secondary);
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &.existing {
        margin-left: 0.5rem;
    }
    span {
        flex: 1;
    }
    button {
        --bg-color: var(--bg-primary);
        padding: 0.25rem 0.5rem;
    }
}
.add {
    gap: 0.5rem;
}
.add.missing {
    color: var(--text-tertiary);
    font-size: var(--font-small);
}
</style>