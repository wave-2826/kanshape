<script lang="ts">
    import { autofocus } from "$lib/actions";
    import { getConfig } from "$lib/config";
    import { deleteRecord, save, type ExpandResponse } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { Pencil, SavePen, Trash } from "@lucide/svelte";

    const {
        file = $bindable(),
        fileUrl,
    }: {
        file: ExpandResponse<"files", "">,
        fileUrl: string
    } = $props();

    const filePath = $derived(new URL(fileUrl).pathname);
    let config = getConfig();

    let renaming = $state(false);
    let renameInput = $state<HTMLInputElement | null>(null);
    function saveRename() {
        if(!renameInput) return;

        if(renameInput.value !== file.path) {
            file.path = renameInput.value;
            save(Collections.Files, {
                id: file.id,
                path: file.path
            }, { create: false });
        }
        renaming = false;
    }
</script>

<div
    class="file"
    role="group"
    draggable="true"
    ondragstart={(e) => {
        e.dataTransfer?.setData('text/plain', filePath);
        if(e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
    }}
>
    <!-- TODO: file preview logic here and for card files -->
    {#if file.file.endsWith('.png') || file.file.endsWith('.jpg') || file.file.endsWith('.jpeg') || file.file.endsWith('.gif') || file.file.endsWith('.svg')}
        <img src={fileUrl} alt={file.path} draggable="false" />
    {/if}
    {#if renaming}
        <input
            type="text"
            value={file.path}
            bind:this={renameInput}
            onblur={saveRename}
            onkeydown={(e) => {
                if(e.key === 'Enter') {
                    saveRename();
                } else if(e.key === 'Escape') {
                    renaming = false;
                }
            }}
            class="rename"
            // if the cursor is at the end, move it to before the extension
            onfocus={(e) => {
                const value = e.currentTarget.value;
                const dotIndex = value.lastIndexOf('.');
                if(dotIndex > 0) {
                    e.currentTarget.setSelectionRange(dotIndex, dotIndex);
                } else {
                    e.currentTarget.select();
                }
            }}
            use:autofocus
        />
    {:else}
        <a class="name" href={fileUrl} target="_blank" draggable="false">{file.path}</a>
    {/if}
    <button title="Rename {file.path}" onclick={() => {
        renaming = !renaming;
        if(!renaming) {
            saveRename();
        }
    }}>
        {#if renaming}
            <SavePen />
        {:else}
            <Pencil />
        {/if}
    </button>
    <button class="delete" title="Delete {file.path}" onclick={() => {
        // If the file used is referenced by any config items, warn
        const check = (c: { [item: string]: string | any }): boolean => {
            for(const value of Object.values(c)) {
                if(typeof value === 'string' && value.includes(file.file)) {
                    return true;
                } else if(typeof value === 'object') {
                    if(check(value)) return true;
                }
            }
            return false;
        };
        if(check(config)) {
            if(!confirm(`The file "${file.path}" is referenced by one or more config items. Are you sure you want to delete it?`)) {
                return;
            }
        }

        deleteRecord(Collections.Files, file.id);
    }}><Trash /></button>
</div>

<style lang="scss">
.file {
    background-color: var(--bg-secondary);
    border-radius: 4px;
    padding: 0.25rem;

    display: flex;
    align-items: center;
    gap: 0.5rem;

    img {
        width: 2rem;
        height: 2rem;
        object-fit: cover;
        border-radius: 4px;
    }
    .name, .rename {
        flex: 1;
        padding: 0.25rem;
    }

    button {
        --bg-color: var(--bg-primary);
        padding: 0.25rem;
    }
    .delete {
        color: var(--error);
    }
}
</style>