<script lang="ts">
    import { CREATE_SYMBOL, type CardMetadataFieldType, type MetadataFile, type MetadataValue } from '$lib/data/project';
    import { FileIcon, Plus, Sparkles, SquareArrowRightExit, X } from 'lucide-svelte';
    import { getUploadContext } from './uploadContext';

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
        <div class="file-capsule" class:export={file.id === CREATE_SYMBOL}>
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
        <label class="button">
            <Plus /> Add file(s)
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
            }} />
        </label>
    {:else}
        {#if (value as MetadataFile)?.id}
            {@render capsule(value as MetadataFile)}
        {:else}
            <label class="button">
                <Plus /> Add file
                <input type="file" onchange={async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if(files && files.length > 0) {
                        const file = files[0];
                        const generatedName = crypto.randomUUID().replace(/-/g, "");
                        uploadContext.queueUpload(generatedName + "." + file.name.split(".").pop(), file);
                        value = { name: file.name, id: generatedName };
                    }
                }} />
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

    input[type="file"] {
        display: none;
    }
}
</style>