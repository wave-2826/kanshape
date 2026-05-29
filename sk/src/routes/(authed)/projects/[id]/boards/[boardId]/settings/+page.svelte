<script lang="ts">
    import { goto } from '$app/navigation';
    import BoardSettings, { boardCreationData, deleteBoard, saveBoardRecords, type BoardCreationData } from '$lib/components/projects/BoardSettings.svelte';
    import { metadata } from '$lib/metadata';
    import { batch } from '$lib/pocketbase';
    import { deepEqual } from '$lib/util';
    import { ArrowLeft, Save, Trash } from 'lucide-svelte';
    import { getBoardContext, getProjectContext } from '../../../context';

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
    
    let changed = $derived.by(() => {
        if(!$board) return false;
        return !deepEqual(creationData, originalCreationData)
    });

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

{#snippet backButton()}
    <button onclick={() => {
        if(changed) {
            if(!confirm("You have unsaved changes. Are you sure you want to leave?")) return;
        }
        if(!$project) {
            goto("/");
            return;
        }
        goto(`/projects/${$project.id}/boards/${$board?.id}`);
    }} class="back">
        <ArrowLeft />
        Back to board
        {#if changed}
            <span class="unsaved-warning">Unsaved changes</span>
        {/if}
    </button>
{/snippet}

<div class="details">
    {@render backButton()}

    {#if creationData}
        <BoardSettings bind:board={creationData} />
    {/if}

    <div class="actions">
        {@render backButton()}
        <div style="flex: 1"></div>
        <button onclick={deleteSelf} class="delete">
            <Trash />
            Delete board
        </button>
        <button onclick={saveChanges} class="save" disabled={!changed}>
            <Save />
            Save Changes
        </button>
    </div>
</div>

<style lang="scss">
.back {
    align-self: flex-start;

    .unsaved-warning {
        color: var(--error);
        font-size: var(--font-small);
        margin-left: 0.5rem;
    }
}
.details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    overflow-y: auto;
    height: 100%;
    padding-bottom: 10rem;
}

.actions {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 1rem;

    button {
        padding: 0.5rem 1rem;
        font-size: var(--font-medium);
    }
    
    .save {
        --bg-color: var(--bg-selection);
    }
    .delete {
        color: var(--error);
    }
}
</style>