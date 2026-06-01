<script lang="ts">
    import { nav } from '$lib/navigation';
    import { ArrowLeft, Save, Trash } from 'lucide-svelte';
    import type { Snippet } from 'svelte';

    const {
        children,
        returnPath,
        settingsType,
        changed,
        onsave,
        ondelete
    }: {
        children: Snippet;
        returnPath: string;
        settingsType: string;
        changed: boolean;
        onsave: () => void;
        ondelete: () => void;
    } = $props();
</script>

{#snippet backButton()}
    <button onclick={() => {
        if(changed) {
            if(!confirm("You have unsaved changes. Are you sure you want to leave?")) return;
        }
        nav(returnPath);
    }} class="back">
        <ArrowLeft />
        Back to {settingsType}
        {#if changed}
            <span class="unsaved-warning">Unsaved changes</span>
        {/if}
    </button>
{/snippet}

<div class="details">
    {@render backButton()}

    {@render children()}

    <div class="actions">
        {@render backButton()}
        <div style="flex: 1"></div>
        <button onclick={ondelete} class="delete">
            <Trash />
            Delete {settingsType}
        </button>
        <button onclick={onsave} class="save" disabled={!changed}>
            <Save />
            Save changes
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