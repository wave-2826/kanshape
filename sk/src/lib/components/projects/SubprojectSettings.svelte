<script lang="ts" module>;
    import { Collections, type Create, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import type { BatchService } from "pocketbase";
    import { CancelBatch, deleteRecord, query } from "$lib/pocketbase";

    /**
     * Attempts to delete the subproject given by the passed record, but warns if there is still data associated
     * with it.
     */
    export async function deleteSubproject(subproject: SubprojectsRecord, batch?: BatchService) {
        // Check if any cards are associated with the subproject and warn
        if((await query(Collections.Cards, {
            filter: `subprojects ~ "${subproject.id}"`
        })).length > 0) {
            if(!confirm(`Subproject "${subproject.name}" has associated cards. Deleting it will remove it from every card. Are you sure you want to delete it?`)) {
                throw new CancelBatch("User cancelled batch due to associated cards with subproject");
            }
        }

        await deleteRecord(Collections.Subprojects, subproject.id, { batch });
    }
</script>

<script lang="ts">
    import { createPartIDString } from "$lib/parts";
    import type { ProjectLinkedSite } from "$lib/data/project"
    import LinkedSiteDetails from "./LinkedSiteDetails.svelte";
    import OnshapeLinks from "./OnshapeLinks.svelte";

    const {
        subproject = $bindable(),
        panelBackgrounds,
        editing = false,
        sectionPartIDPrefixes
    }: {
        subproject: Create<"subprojects">;
        panelBackgrounds?: string;
        editing?: boolean;
        sectionPartIDPrefixes: string[];
    } = $props();

    function orList(list: string[]) {
        if(list.length === 0) return "";
        if(list.length === 1) return list[0];
        return `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}`;
    }
</script>

<div class="subproject">
    <input type="text" placeholder="Subproject name" bind:value={subproject.name} />
    <textarea placeholder="Subproject description (optional)" bind:value={subproject.description}></textarea>
    
    <div class="option">
        <label for="partIdOffset">Part ID offset</label>
        <input type="number" placeholder="Part ID offset" bind:value={subproject.part_id_offset} min="0" />
        <span class="part-id-preview">
            {#if sectionPartIDPrefixes.length > 0}
                Part IDs will look like {orList(sectionPartIDPrefixes.map(prefix => createPartIDString(prefix, subproject.part_id_offset || 0, 1, 1)))}
            {:else}
                No section prefixes defined. If there were any, part IDs would look like {createPartIDString("prefix", subproject.part_id_offset || 0, 1, 1)}
            {/if}
        </span>
    </div>
    
    <h2>Linked pages</h2>
    <p>Linked Onshape documents</p>
    {#if editing}
        <div class="linked-sites">
            <!-- Technically, this doesn't have the same saving behavior as the rest of the settings, but... whatever -->
            <OnshapeLinks linkedTo={subproject as SubprojectsRecord} fullPreview />
        </div>
    {/if}
    
    <p>Linked sites</p>
    <LinkedSiteDetails bind:linkedSites={subproject.linked_sites as ProjectLinkedSite[]} background={panelBackgrounds} />
</div>

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "settings.scss";

.subproject {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

h2 {
    margin-left: 0.5rem;
}
label, p {
    font-size: var(--font-small);
    margin-left: 0.5rem;
    margin-top: 0.5rem;
}
</style>