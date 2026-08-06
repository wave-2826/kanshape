<script lang="ts">
    import { getUploadContext } from './uploadContext';
    import PopoverButton from '$lib/components/PopoverButton.svelte';
    import { partExportTypes, type PartExport, type PartExportType } from '$lib/data/parts';
    import { client } from '$lib/pocketbase';
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
    import { CREATE_SYMBOL, type CardMetadataFieldType, type MetadataFile } from '$lib/data/metadata';
    import { Box, Boxes, FileIcon, Plus, Sparkles, SquareArrowRightExit, Upload, X } from '@lucide/svelte';
    import { showAlert } from '$lib/site';

    let {
        type, value = $bindable()
    }: {
        type: CardMetadataFieldType & { base: "file" },
        value: MetadataFile | MetadataFile[] | null
    } = $props();

    const uploadContext = getUploadContext();
    const getFileUrl = uploadContext.getFileUrl;
</script>


<div class="files">
    {#snippet capsule(file: MetadataFile)}
        {@const hasFile = uploadContext.hasFile(file)}
        <!-- TODO: file previews for images and models -->
        <div
            class="file-capsule"
            class:export={file.id === CREATE_SYMBOL || file.type === "export" || file.type === "auto_export"}
            title={
                file.id === CREATE_SYMBOL ? "This file will be generated for a part." :
                !hasFile ? "This file doesn't exist on the card yet. It's likely being exported." :
                file.type === "auto_export" ? "This export was automatically created based on the detected part." : ""
            }
        >
            {#if file.id !== CREATE_SYMBOL && !hasFile}
                <LoadingSpinner class={$css("file-icon")} />
            {:else if (file.id === CREATE_SYMBOL && file.createType === "auto_export") || (file.id !== CREATE_SYMBOL && file.type === "auto_export")}
                <Sparkles class={$css("file-icon")} />
            {:else if (file.id === CREATE_SYMBOL && file.createType === "export") || (file.id !== CREATE_SYMBOL && file.type === "export")}
                <SquareArrowRightExit class={$css("file-icon")} />
            {:else}
                <FileIcon class={$css("file-icon")} />
            {/if}
            {#if getFileUrl}
                <!-- TODO: allow renaming uploaded files -->
                <a
                    href={getFileUrl(file as MetadataFile)}
                    target="_blank"
                    onclick={(e) => {
                        // manual download handler to set the filename properly
                        // progressive enhancement; the link will work normally too
                        e.preventDefault();
                        const url = getFileUrl(file as MetadataFile);
                        // TODO: Download progress indicator
                        // we could also use a request middleware to add a content-disposition header
                        // with the correct name based on a query param or something instead of this
                        // custom logic? would allow using the browser download thingy.
                        fetch(url).then(async (res) => {
                            if(res.status !== 200) {
                                console.error("Failed to download file", res.status, await res.text());
                                return;
                            }
                            const blob = await res.blob();
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = (file as MetadataFile).name;
                            a.click();
                        }).catch((err) => {
                            console.warn("Failed to download file", err);
                            showAlert({
                                severity: "warning",
                                title: "Failed to download file",
                                text: err.message
                            });
                        });
                    }}
                >{(file as MetadataFile).name}</a>
            {:else}
                <span>{(file as MetadataFile).name}</span>
            {/if}
            <button onclick={() => {
                if(type.multi) {
                    value = (value as MetadataFile[]).filter(f => f !== file);
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

    {#if type.multi || !value}
        {#snippet uploadInput(close?: () => void)}
            {#if type.multi}
                <input type="file" multiple onchange={async (e) => {
                    const files = e.currentTarget.files;
                    if(files && files.length > 0) {
                        for(const file of files) {
                            // The actual name of the file isn't the uploaded name, but we store it
                            const id = crypto.randomUUID().replace(/-/g, "");
                            uploadContext.queueUpload(id + "." + file.name.split(".").pop(), file);
                            value = [...(value as MetadataFile[]), { name: file.name, id }];
                        }
                    }
                    close?.();
                }} />
            {:else}
                <input type="file" onchange={async (e) => {
                    const files = e.currentTarget.files;
                    if(files && files.length > 0) {
                        const file = files[0];
                        const id = crypto.randomUUID().replace(/-/g, "");
                        uploadContext.queueUpload(id + "." + file.name.split(".").pop(), file);
                        value = { name: file.name, id };
                    }
                    close?.();
                }} />
            {/if}
        {/snippet}

        {#if uploadContext.partExport !== undefined && uploadContext.partExport.hasParts()}
            <PopoverButton contentClass={$css("add-part-export-content")}>
                <Plus /> Add {type.multi ? "files" : "file"} or exports
                {#snippet content({ close })}
                    <label class="button">
                        <Upload /> Upload...
                        {@render uploadInput(close)}
                    </label>
                    {#await uploadContext.partExport?.getParts()}
                        <p>loading parts</p>
                    {:then parts}
                        {#each parts as part}
                            {@const partName = ("partData" in part ? part.partData.name : part.part_data?.name) ?? "Unknown part"}
                            <span class="part-label">
                                {#if part.type === "assembly"}<Boxes />
                                {:else}<Box />{/if}
                                {partName}
                            </span>
                            <div class="part-actions">
                                {#each Object.entries(partExportTypes).filter(([_k, t]) => t.canBeAssembly || part.type !== "assembly") as [k, exportType]}
                                    <button
                                        class="part-action"
                                        onclick={() => {
                                            const name = (partName + exportType.extension).replace(/[^a-zA-Z0-9_.-]/g, "_");
                                            let newPart: MetadataFile;
                                            if(uploadContext.partExport?.cardId === null) {
                                                newPart = {
                                                    name,
                                                    id: CREATE_SYMBOL,
                                                    createType: "export",
                                                    forPart: "internalId" in part ? { internalId: part.internalId } : { record: part.id },
                                                    exportType: k as PartExportType
                                                };
                                            } else {
                                                const id = crypto.randomUUID().replace(/-/g, "");
                                                if(!("id" in part)) {
                                                    console.error("Part doesn't have an id", part);
                                                    return;
                                                }

                                                newPart = {
                                                    name,
                                                    id,
                                                    type: "export",
                                                    partRecordId: part.id
                                                };
                                                client.send("/api/parts/export_all", {
                                                    method: "POST",
                                                    body: {
                                                        exports: [{
                                                            id,
                                                            partRecordId: part.id,
                                                            type: k as PartExportType,
                                                            cardId: uploadContext.partExport?.cardId
                                                        } satisfies PartExport]
                                                    }
                                                });
                                            }
    
                                            if(type.multi) {
                                                value = [...(value as MetadataFile[]), newPart];
                                            } else {
                                                value = newPart;
                                            }
                                            close();
                                        }}
                                        title="Add a {exportType.name} export for this part"
                                    >
                                        <SquareArrowRightExit /> {exportType.name}
                                    </button>
                                {/each}
                            </div>
                        {/each}
                    {/await}
                {/snippet}
            </PopoverButton>
        {:else}
            <label class="button">
                <Plus /> Add {type.multi ? "files" : "file"}
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
            color: inherit;
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
    max-height: 25rem;
    overflow-y: auto;

    font-size: var(--font-small);

    button, .button {
        padding: 0.25rem 0.5rem;

        :global(svg) {
            width: 1em;
            height: 1em;
        }
    }

    .part-label {
        flex-shrink: 0;

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
    .part-actions {
        margin-left: 0.75rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
    }
}
</style>