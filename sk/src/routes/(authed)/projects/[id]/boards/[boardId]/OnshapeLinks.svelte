<script lang="ts">
    import { getConfig } from "$lib/config";
    import { deleteRecord, watch, type PageStore } from "$lib/pocketbase";
    import { Collections, type OnshapeDocumentsResponse, type ProjectsResponse } from "$lib/pocketbase/generated-types";
    import { X } from "lucide-svelte";

    const {
        project,
        fullPreview = false
    }: {
        project: ProjectsResponse,
        /** If true, this is a full preview (not just small links for the page header). */
        fullPreview?: boolean
    } = $props();

    const config = getConfig();

    let links = $state<PageStore<OnshapeDocumentsResponse> | null>(null);
    $effect(() => {
        (async () => {
            links = await watch(Collections.OnshapeDocuments, {
                filter: `project = "${project.id}"`
            }, 1, 5);
        })();
    });
</script>

{#if links !== null && $links}
    {#if fullPreview && $links.items.length === 0}
        <p>No linked Onshape documents.</p>
    {/if}
    {#each $links.items as link}
        <span class:full-preview={fullPreview} class="link-badge" class:button={!fullPreview}>
            <a href={`${config.onshape.baseDomain}/documents/${link.id}`} target="_blank" rel="noopener noreferrer">
                <!-- TODO: we can store this ourselves -->
                <img src="https://www.google.com/s2/favicons?domain=onshape.com&sz=32" alt="Onshape" width="16" height="16" />
                {link.title ? link.title : link.id}
            </a>
            {#if fullPreview}
                <button class="remove" onclick={(e) => {
                    e.preventDefault();
                    deleteRecord(Collections.OnshapeDocuments, link.id).catch((err) => {
                        console.error("Failed to remove linked document:", err);
                    });
                }}><X /></button>
            {/if}
        </span>
    {/each}
{/if}

<style lang="scss">
@use "./linkBadge.scss";

.link-badge.full-preview {
    font-size: var(--font-medium);
}

img {
    margin-left: -0.25rem;
}

button {
    --bg-color: transparent;
    padding: 0.25rem;
    width: 1.5rem;
    height: 1.5rem;
    color: var(--text-secondary);
    margin-right: -0.25rem;
}
</style>