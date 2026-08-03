<!--
A file input field. Can either have no file (value="") or an uploaded file (value=its full url).
Allows dragging and dropping files from the manager.
-->

<script lang="ts">
    import { client, type ExpandResponse } from "$lib/pocketbase";
    import { File, RotateCcw, X } from "@lucide/svelte";

    let {
        id,
        value = $bindable(),
        onchange,
        defaultValue,
        files
    }: {
        /** id of the input element */
        id?: string,
        value: string,
        onchange?: (e: { currentTarget: { value: string } }) => void,
        defaultValue?: string,
        files: ExpandResponse<"files", "">[] | null
    } = $props();

    let dragging = $state(false);

    const valueFileName = $derived(value ? value.split('/').pop() || '' : '');
    const isFile = $derived(value.startsWith('/api/files'));

    /** The matching uploaded file record, if the value references one. */
    const matchedFile = $derived(isFile && files ? files.find((f) => f.file === valueFileName) ?? null : null);
    const fileUrl = $derived(matchedFile ? client.files.getURL(matchedFile, matchedFile.file, { download: true }) : "");

    function handleDrop(e: DragEvent) {
        dragging = false;
        const path = e.dataTransfer?.getData("text/plain");
        if(path) {
            value = path;
            onchange?.({ currentTarget: { value: path } });
        }
    }

    function clear() {
        value = defaultValue ?? "";
        onchange?.({ currentTarget: { value } });
    }
</script>

<div
    class="file-input"
    role="group"
    class:dragging
    ondragover={(e) => {
        e.preventDefault();
        dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={handleDrop}
    title="Drag a file here or input a full URL"
>
    {#if matchedFile}
        <div class="preview">
            {#if matchedFile.file.endsWith('.png') || matchedFile.file.endsWith('.jpg') || matchedFile.file.endsWith('.jpeg') || matchedFile.file.endsWith('.gif') || matchedFile.file.endsWith('.svg')}
                <img src={fileUrl} alt={matchedFile.path} />
            {:else}
                <File />
            {/if}
            <a class="name" href={fileUrl} target="_blank">{matchedFile.path}</a>
            <button class="clear" title="Clear file" onclick={clear}><X /></button>
        </div>
    {:else}
        <div class="input-wrapper">
            <input {id} type="text" bind:value {onchange} placeholder="Drag a file here or enter a file name manually..." />
            <File class={$css("input-icon")} />
            {#if defaultValue && value !== defaultValue}
                <button class="clear" onclick={() => {
                    value = defaultValue;
                    onchange?.({ currentTarget: { value: defaultValue } });
                }}>
                    <RotateCcw />
                </button>
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
.file-input {
    margin: 0 0.5rem;

    &.dragging input {
        --bg-color: var(--bg-selection);
    }
    &.dragging .preview {
        background-color: var(--bg-selection);
    }
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.25rem;

    .input-icon {
        position: absolute;
        left: 0.5rem;
        color: var(--text-secondary);
    }
    input {
        padding-left: 2rem;
        flex: 1;
    }
    .clear {
        aspect-ratio: 1;
        align-self: stretch;
    }
}

.preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    background-color: var(--bg-secondary);
    border-radius: 4px;
    padding: 0.25rem;
    transition: background-color 0.1s ease;

    img {
        width: 2rem;
        height: 2rem;
        object-fit: cover;
        border-radius: 4px;
    }

    .name {
        flex: 1;
        padding: 0.25rem;
    }

    .clear {
        --bg-color: var(--bg-primary);
        padding: 0.25rem;
        color: var(--error);
    }
}
</style>