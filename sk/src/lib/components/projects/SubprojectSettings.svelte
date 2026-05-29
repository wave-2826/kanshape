<script lang="ts" module>;
    import { Collections, type Create, type ProjectsTypeOptions, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
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
        projectType,
        partIdPrefix,
        panelBackgrounds
    }: {
        subproject: Create<"subprojects">;
        projectType: ProjectsTypeOptions;
        partIdPrefix: string;
        panelBackgrounds?: string;
    } = $props();
</script>

<div class="subproject">
    <input type="text" placeholder="Subproject name" bind:value={subproject.name} />
    <textarea placeholder="Subproject description (optional)" bind:value={subproject.description}></textarea>
    {#if projectType === "manufacturing"}
        <div class="option">
            <label for="partIdOffset">Part ID offset</label>
            <input type="number" placeholder="Part ID offset" bind:value={subproject.part_id_offset} min="0" />
            <span class="part-id-preview">Part IDs will look like {createPartIDString(partIdPrefix, subproject.part_id_offset || 0, 1, 1)}</span>
        </div>
    {/if}

    <h2>Linked pages</h2>
    {#if projectType === "manufacturing" && subproject.id}
        <p>Linked Onshape documents</p>
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