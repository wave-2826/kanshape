<script lang="ts" module>
    export async function queryExistingParts(sel: PartSelection) {
        return await query(Collections.Parts, {
            filter: 
                (sel.type === "part" ?
                    `type="part" && part_id="${sel.partId}"` :
                    `type="assembly"`)
                + `&& document_id="${sel.documentId}" && element_id="${sel.elementId}" && wvm="${sel.wvm}" && wvm_id="${sel.wvmId}"`
                + (sel.configuration !== "default" ? ` && configuration="${sel.configuration}"` : "")
        }).catch(() => null);
    }

    export async function updatePartRecord(
        existingOrNewId: PartsResponse[] | string | null,
        sel: PartSelection,
        partData: PartHeuristicsResult | AssemblyData | null,
        cardId?: string
    ): Promise<PartsResponse | null> {
        let record: PartsResponse | null = null;
        if(existingOrNewId && Array.isArray(existingOrNewId) && existingOrNewId.length > 0) {
            const existing = existingOrNewId;

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
                id: typeof existingOrNewId === "string" ? existingOrNewId : undefined,
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

    export async function generatePartPreview(partRecordId: string) {
        return await client.send("/api/parts/generate_preview", {
            method: "POST",
            body: JSON.stringify({ part_id: partRecordId })
        });;
    }
</script>

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
    let part = $state<TypedPartsResponse | null>(null);
    let lastValue: string | null | undefined = null;
    $effect(() => {
        if(hasValue && value !== lastValue) {
            status = "loading";
            lastValue = value;
            const store = deasyncify(
                (watchOne(Collections.Parts, value!, {
                    requestKey: null
                }) as Promise<Readable<TypedPartsResponse | null>>)
                .catch((e) => {
                    console.error(e);
                    return readable(null);
                })
            );
            const unsub = store.subscribe((v) => {
                status = "display";
                part = v;
            });
            return () => unsub();
        }
    });

    let status = $state<"display" | "loading" | "existing" | "error">("display");

    const onshapeCtx = getOnshapeContext();

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

        const record = await updatePartRecord(existing, sel, partData, cardId);
        if(!record) return;

        status = "display";

        // regenerate the preview
        generatePartPreview(record.id);

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

        const sel = await onshapeCtx.client.getPartSelection();
        if(!sel) return;

        status = "loading";

        let existing = await queryExistingParts(sel);
        if(existing && existing.length > 0) {
            status = "existing";

            const record = await updatePartRecord(existing, sel, null, cardId);
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

    function setPart(v: TypedPartsResponse) {
        part = v;
        if(value !== v.id) value = v.id;

        save(Collections.Parts, {
            ...part,
            preview_model: undefined
        });
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
                    <CardPart bind:part={() => part!, setPart} />
                    {#if status === "existing"}
                        <div class="placeholder extra-info">
                            <span>This part has already been added. Refresh its inforamtion?</span>
                            <div class="buttons">
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
                        </div>
                    {/if}
                </div>
            {/if}
        {:else}
            <div class="placeholder">Invalid part</div>
        {/if}
    {:else}
        {#if onshapeCtx.onOnshape}
            {#if cardId}
                <button class="add" onclick={addPart}>
                    + Add part
                    <img src="/onshape.png" alt="Onshape" width="16" height="16" />
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
    container-type: inline-size;
}
.placeholder {
    background-color: var(--bg-secondary);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &.extra-info {
        margin-left: 0.5rem;
    }
    .buttons {
        display: flex;
        gap: 0.5rem;
    }

    span {
        flex: 1;
    }
    button {
        --bg-color: var(--bg-primary);
        padding: 0.25rem 0.5rem;
    }
}

@container (max-width: 340px) {
    .placeholder.extra-info {
        flex-direction: column;
        align-items: flex-start;
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