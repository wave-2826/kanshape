<script lang="ts">
    import BoardSettings, { boardCreationData, deleteBoard, saveBoardRecords, type BoardCreationData } from '$lib/components/projects/BoardSettings.svelte';
    import { metadata } from '$lib/metadata';
    import { batch } from '$lib/pocketbase';
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
            if(!creationData) return;
            await saveBoardRecords(creationData, originalCreationData, batch);
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