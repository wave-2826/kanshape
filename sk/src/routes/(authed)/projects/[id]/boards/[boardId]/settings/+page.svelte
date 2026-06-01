<script lang="ts">
    import BoardSettings, { boardCreationData, deleteBoard, saveBoardRecords, type BoardCreationData } from '$lib/components/projects/BoardSettings.svelte';
    import { metadata } from '$lib/metadata';
    import { batch, save } from '$lib/pocketbase';
    import { Collections } from '$lib/pocketbase/generated-types';
    import { deepEqual } from '$lib/util';
    import { getBoardContext, getProjectContext } from '../../../context';
    import SettingsPage from '../../../SettingsPage.svelte';

    const project = $derived(getProjectContext().project);
    const board = $derived(getBoardContext().board);
    
    $effect(() => {
        $metadata.title = $board ? `${$board.title} Settings` : "Project Settings";
    });

    let originalCreationData = $derived($board ? boardCreationData($board) : null);
    // svelte-ignore state_referenced_locally
    let creationData = $state<BoardCreationData | null>(originalCreationData);
    $effect(() => {
        if($board) creationData = originalCreationData;
        else creationData = null;
    });
    
    let changed = $derived(!deepEqual(creationData, originalCreationData));

    async function saveChanges() {
        await batch(async (batch) => {
            if(!$project) return;

            if(!creationData) return;
            await saveBoardRecords(creationData, originalCreationData, batch);
            // Re-save the project itself to trigger realtime updates
            // this is the most efficient way I've found to make this work. oh well
            await save(Collections.Projects, $project, { create: false, batch });
        });
    }

    async function deleteSelf() {
        await batch(async (batch) => {
            if($board) await deleteBoard($board, batch);
        });
    }
</script>

<SettingsPage
    returnPath={`/projects/${$project?.id}/boards/${$board?.id ?? ""}`}
    settingsType="board"
    {changed}
    onsave={saveChanges}
    ondelete={deleteSelf}
>
    {#if creationData}
        <BoardSettings bind:board={creationData} />
    {/if}
</SettingsPage>