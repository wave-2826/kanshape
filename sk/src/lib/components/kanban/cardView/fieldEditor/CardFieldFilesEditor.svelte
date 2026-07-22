<script lang="ts">
    import { CREATE_SYMBOL, partExportTypes, type CardMetadataFieldType, type MetadataFile, type PartExportType } from '$lib/data/project';
    import { Box, FileIcon, Plus, Sparkles, SquareArrowRightExit, Upload, X } from 'lucide-svelte';
    import { getUploadContext } from './uploadContext';
    import PopoverButton from '$lib/components/PopoverButton.svelte';

    let {
        type, value = $bindable()
    }: {
        type: CardMetadataFieldType<false> & { base: "file" },
        value: MetadataFile | MetadataFile[] | null
    } = $props();

    const uploadContext = getUploadContext();
    const getFileUrl = uploadContext.getFileUrl;
</script>


<div class="files">
    {#snippet capsule(file: MetadataFile)}
        <div
            class="file-capsule"
            class:export={file.id === CREATE_SYMBOL}
            title={file.id === CREATE_SYMBOL ? "This file will be generated for a part." : ""}
        >
            {#if file.id === CREATE_SYMBOL && file.createType === "auto_export"}
                <Sparkles class={$css("file-icon")} />
            {:else if file.id === CREATE_SYMBOL && file.createType === "export"}
                <SquareArrowRightExit class={$css("file-icon")} />
            {:else}
                <FileIcon class={$css("file-icon")} />
            {/if}
            {#if getFileUrl}
                <a
                    href={getFileUrl(file as MetadataFile)}
                    target="_blank"
                    onclick={(e) => {
                        // manual download handler to set the filename properly
                        // progressive enhancement; the link will work normally too
                        e.preventDefault();
                        const url = getFileUrl(file as MetadataFile);
                        // TODO: Download progress indicator
                        // TODO: Handle errors
                        fetch(url).then(async (res) => {
                            const blob = await res.blob();
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = (file as MetadataFile).name;
                            a.click();
                        });
                    }}
                >{(file as MetadataFile).name}</a>
            {:else}
                <span>{(file as MetadataFile).name}</span>
            {/if}
            <button onclick={() => {
                if(type.multi) {
                    value = (value as MetadataFile[]).filter(f => f.id !== (file as MetadataFile).id);
                } else {
                    value = null;
                }
            }} class="remove unstyled"><X /></button>
        </div>
    {/snippet}
    {#if type.multi}
        {#each (value as MetadataFile[]) as file, index (index)}
            {@render capsule(file)}
        {/each}
    {:else}
        {#if (value as MetadataFile)?.id}
            {@render capsule(value as MetadataFile)}
        {/if}
    {/if}

    {#if type.multi || !(value as MetadataFile).id}
        {#snippet uploadInput(close?: () => void)}
            {#if type.multi}
                <input type="file" multiple onchange={async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if(files && files.length > 0) {
                        for(const file of files) {
                            // The actual name of the file isn't the uploaded name, but we store it
                            const generatedName = crypto.randomUUID().replace(/-/g, "");
                            uploadContext.queueUpload(generatedName + "." + file.name.split(".").pop(), file);
                            value = [...(value as MetadataFile[]), { name: file.name, id: generatedName }];
                        }
                    }
                }} onclick={close} />
            {:else}
                <input type="file" onchange={async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if(files && files.length > 0) {
                        const file = files[0];
                        const generatedName = crypto.randomUUID().replace(/-/g, "");
                        uploadContext.queueUpload(generatedName + "." + file.name.split(".").pop(), file);
                        value = { name: file.name, id: generatedName };
                    }
                }} onclick={close} />
            {/if}
        {/snippet}

        {#if uploadContext.partExport !== undefined}
            <PopoverButton contentClass={$css("add-part-export-content")}>
                <Plus /> Add {type.multi ? "file(s)" : "file"}
                {#snippet content({ close })}
                    <label class="button">
                        <Upload /> Upload...
                        {@render uploadInput(close)}
                    </label>
                    {#await uploadContext.partExport?.getParts()}
                        <p>loading parts</p>
                    {:then parts}
                        {#each parts as part}
                            <span class="part-label"><Box /> {"partData" in part ? part.partData.name : part.part_data?.name}</span>
                            {#each Object.entries(partExportTypes) as [k, exportType]}
                                <button
                                    class="part-action"
                                    onclick={() => {
                                        const name = (exportType.name + "." + exportType.extension).replace(/[^a-zA-Z0-9_.-]/g, "_");
                                        uploadContext.partExport?.queuePartExport(name, part, k as PartExportType);
                                        value = [...(value as MetadataFile[]), {
                                            name,
                                            id: CREATE_SYMBOL,
                                            createType: "export",
                                            exportType: k as PartExportType
                                        }];
                                        close();
                                    }}
                                >
                                    <SquareArrowRightExit /> Add {exportType.name}
                                </button>
                            {/each}
                        {/each}
                    {/await}
                {/snippet}
            </PopoverButton>
        {:else}
            <label class="button">
                <Plus /> Add {type.multi ? "file(s)" : "file"}
                {@render uploadInput()}
            </label>
        {/if}
    {/if}
</div>

<style lang="scss">
.files {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;

    .file-capsule {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0 0 0 0.5rem;
        background-color: var(--bg-secondary);
        border-radius: 0.25rem;

        a {
            color: var(--text-primary);
        }
        .file-icon {
            width: 1em;
            height: 1em;
            margin-right: 0.25rem;
        }

        .remove {
            padding: 0.25rem;
            color: var(--text-secondary);
            transition: color 0.2s;
        }
        .remove:hover {
            color: var(--text-primary);
        }

        &.export {
            color: var(--success);
        }
    }
}

.button input[type="file"] {
    display: none;
}
.add-part-export-content {
    padding: 0.5rem;

    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    font-size: var(--font-small);

    button, .button {
        padding: 0.25rem 0.5rem;

        :global(svg) {
            width: 1em;
            height: 1em;
        }
    }

    .part-label {
        color: var(--text-secondary);
        margin-top: 0.5rem;

        max-width: 30ch;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;

        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .part-action {
        margin-left: 0.5rem;
    }
}
</style>