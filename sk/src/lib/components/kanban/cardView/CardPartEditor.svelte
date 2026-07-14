<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import { getPartHeuristics } from "$lib/onshape/partHeuristics";
    import { query, save, watchOne } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { deasyncify } from "$lib/util";

    const {
        value = $bindable(),
        cardId
    }: {
        value: string | null | undefined;
        cardId: string;
    } = $props();

    const hasValue = $derived(value !== null && value !== undefined && value !== "");
    const part = $derived(hasValue ? deasyncify(watchOne(Collections.Parts, value!)) : null);

    const onshapeCtx = getOnshapeContext();
    
    async function getPartSelection(): Promise<{
        wvm: "w" | "v" | "m";
        wvmId: string;
        documentId: string;
        elementId: string;
        partId: string;
    } | null> {
        if(onshapeCtx.location === "right-panel") {
            const selections = await onshapeCtx.client?.requestSelection("Select a part to create a card for.", ["BODY"]);
            return selections && selections.length > 0 ? {
                wvm: onshapeCtx.wvm ?? "w",
                wvmId: onshapeCtx.wvmId ?? "",
                documentId: onshapeCtx.documentId ?? "",
                elementId: onshapeCtx.partStudioId ?? "",
                partId: selections[0].selectionId
            } : null;
        } else if(onshapeCtx.location === "tab") {
            const selection = await onshapeCtx.client?.openSelectItemDialog({
                dialogTitle: "Select a part to create a card for.",
                selectParts: true
            });
            if(!selection) return null;

            console.log("Onshape selection:", selection);

            // sanity checks
            if(selection.includeSurfaces || selection.includeWires || selection.isSurface) {
                alert("Please select a part, not a surface or wire.");
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
            if(selection.elementType !== "partstudio" || !selection.elementId) {
                alert("Please select a part from a part studio.");
                return null;
            }
            if(selection.itemType !== "part") {
                alert("Please select a part, not a part studio or assembly.");
                return null;
            }

            let documentId = selection.documentId;
            if(!documentId) {
                alert("No document found for selected part.");
                return null;
            }

            let elementId = selection.elementId;
            if(!elementId) {
                alert("No part studio found for selected part.");
                return null;
            }

            let partId = selection.idTag;
            if(!partId) {
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

            if(selection.isConfigurable && selection.elementConfiguration !== "default") {
                alert("Note that configurable parts aren't directly supported; the part selected will be linked with default options! To add a configured part, create or select an instance of it from a part studio. If you need this use case, let us know.");
                // still return the part
            }

            return { wvm, wvmId, documentId, elementId, partId };
        }
        return null;
    }
</script>

{#if part !== null}
    {#if $part !== null}
        <div class="part">
            <div class="part-name">{$part.part_id}</div>
            <div class="part-number">{JSON.stringify($part.part_heuristic_result)}</div>
        </div>
    {:else}
        <div class="part missing">Loading part...</div>
    {/if}
{:else}
    {#if onshapeCtx.onOnshape}
        <button class="add" onclick={async () => {
            const part = await getPartSelection();
            if(!part) return;

            // Run part heuristics
            const heuristics = await getPartHeuristics(part.documentId, part.wvm, part.wvmId, part.elementId, part.partId);
            if(!heuristics) {
                alert("Failed to gather part heuristics. Please try again.");
                return;
            }
            part.partId = heuristics.partID; // in case the original was a child entity

            const aabb = heuristics.aabb;

            // Make sure there isn't already a part with this ID in the database
            const existing = await query(Collections.Parts, {
                filter: `part_id="${part.partId}" && document_id="${part.documentId}" && element_id="${part.elementId}" && wvm="${part.wvm}" && wvm_id="${part.wvmId}"`
            }).catch(() => null);

            if(existing && existing.length > 0) {
                // Update the existing record
                let past_revision_cards = existing[0].past_revision_cards;
                if(existing[0].current_card != cardId && !past_revision_cards.includes(existing[0].current_card)) {
                    past_revision_cards = [...past_revision_cards, existing[0].current_card];
                }
                await save(Collections.Parts, {
                    id: existing[0].id,
                    part_id: part.partId,
                    document_id: part.documentId,
                    element_id: part.elementId,
                    wvm: part.wvm,
                    wvm_id: part.wvmId,
                    current_card: cardId,
                    part_heuristic_result: heuristics,
                    past_revision_cards,
                    revision: existing[0].revision + 1
                }, { create: false });
            }
        }}>
            + Add part
            <!-- TODO: we can store this ourselves -->
            <img src="https://www.google.com/s2/favicons?domain=onshape.com&sz=32" alt="Onshape" width="16" height="16" />
        </button>
    {:else}
        <div class="add missing">No part selected. Add one from Onshape!</div>
    {/if}
{/if}

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "./props.scss";

.add {
    gap: 0.5rem;
}
.add.missing {
    color: var(--text-tertiary);
    font-size: var(--font-small);
}
</style>