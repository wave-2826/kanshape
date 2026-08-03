<script lang="ts">
    import { client, save, type ExpandResponse } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { Upload } from "@lucide/svelte";
    import FileDisplay from "./FileDisplay.svelte";

    const {
        files = $bindable()
    }: {
        files: ExpandResponse<"files", "">[] | null
    } = $props();
</script>

<section>
    <header>
        <label class="button">
            <input type="file" onchange={(e) => {
                const file = e.currentTarget.files?.[0];
                if(file) {
                    save(Collections.Files, {
                        file,
                        path: file.name
                    }, { create: true });
                }
            }} />
            <Upload />
        </label>
    </header>

    <div class="files">
        {#if files}
            {#each files as file, i}
                {@const fileUrl = client.files.getURL(file, file.file, { download: true })}
                <FileDisplay bind:file={files[i]} {fileUrl} />
            {/each}
        {/if}
    </div>
</section>

<style lang="scss">
section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    background-color: var(--bg-primary);
    border-radius: 4px;
    padding: 0.5rem;

    header {
        display: flex;
        gap: 0.5rem;

        .button {
            padding: 0.25rem;
        }
        input[type="file"] {
            display: none;
        }
    }
}

.files {
    max-height: 15rem;
    overflow-y: auto;

    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>