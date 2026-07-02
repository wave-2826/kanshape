<script lang="ts">
    import { ExternalLink, Pencil, Save, X } from "lucide-svelte";

    let {
        value = $bindable()
    }: {
        value: string
    } = $props();

    let isEditing = $state(false);
    let tempValue = $state(value);

    function handleEdit() {
        isEditing = true;
        tempValue = value;
    }

    function handleSave() {
        isEditing = false;
        value = tempValue;
    }

    function handleCancel() {
        isEditing = false;
        tempValue = value;
    }

    function handleKeyDown(event: KeyboardEvent) {
        if(event.key === "Enter") {
            handleSave();
        } else if(event.key === "Escape") {
            handleCancel();
        }
    }

    // Function to extract favicon URL
    function getFaviconUrl(url: string): string | null {
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.host}&sz=16`;
        } catch(e) {
            return null;
        }
    }
</script>

<div class="url-input-container">
    {#if !isEditing}
        <a href={value} target="_blank" rel="noopener noreferrer" class="url-display">
            {#if value}
                <img 
                    src={getFaviconUrl(value)} 
                    alt="Favicon" 
                    class="favicon"
                    onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                />
                <span class="url-text">{value}</span>
                <ExternalLink />
            {:else}
                <span class="placeholder">No URL</span>
            {/if}
        </a>
        <button class="edit-button" aria-label="Edit URL" onclick={handleEdit}>
            <Pencil />
        </button>
    {:else}
        <!-- svelte-ignore a11y_autofocus -->
        <input
            type="url"
            bind:value={tempValue}
            onkeydown={handleKeyDown}
            class="url-input"
            placeholder="Enter URL"
            autofocus
        />
        <button onclick={handleSave} aria-label="Save URL"><Save /></button>
        <button onclick={handleCancel} aria-label="Cancel"><X /></button>
    {/if}
</div>

<style lang="scss">
    .url-input-container {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        gap: 0.25rem;
    }
    .favicon {
        border-radius: 4px;
        vertical-align: center;
    }
    a {
        flex: 1;
        min-width: 0;
        padding-left: 0.5rem;

        > :global(svg) {
            vertical-align: center;
            width: 1em;
            height: 1em;
            margin-left: 0.25rem;
        }
    }
    button {
        padding: 0.25rem;
    }
    input {
        padding: 0.25rem 0.5rem;
        flex: 1;
    }
</style>