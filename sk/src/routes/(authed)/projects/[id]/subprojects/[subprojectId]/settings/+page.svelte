<script lang="ts">
    import SubprojectSettings, { deleteSubproject } from "$lib/components/projects/SubprojectSettings.svelte";
    import { save } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";

    import { deepEqual } from "$lib/util";
    import { getProjectContext, getSubprojectContext } from "../../../context";
    import SettingsPage from "../../../SettingsPage.svelte";

    const project = $derived(getProjectContext().project);
    const subproject = $derived(getSubprojectContext().subproject);

    // svelte-ignore state_referenced_locally
    let subprojectData = $state($state.snapshot(subproject));
    $effect(() => {
        subprojectData = $state.snapshot(subproject);
    });

    let changed = $derived(!deepEqual(subproject, subprojectData));

    function saveChanges() {
        if(!subprojectData || !$project) return;
        save(Collections.Subprojects, subprojectData, { create: false });
        // Re-save the project itself to trigger realtime updates
        // this is the most efficient way I've found to make this work. oh well
        save(Collections.Projects, $project, { create: false });
    }

    function deleteSelf() {
        if(!subproject) return;
        deleteSubproject(subproject);
    }
</script>

<SettingsPage
    returnPath={`/projects/${$project?.id ?? ""}/subprojects/${subproject?.id ?? ""}`}
    settingsType="subproject"
    {changed}
    onsave={saveChanges}
    ondelete={deleteSelf}
>
    {#if $project && subprojectData}
        <SubprojectSettings
            bind:subproject={subprojectData}
            projectType={$project.type}
            partIdPrefix={$project.part_id_prefix}
        />
    {/if}
</SettingsPage>