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

    function parseUrl(url: string): {
        protocol: string;
        domain: string;
        port: string;
        path: string;
        query: string;
    } {
        // We always want the number of characters to line up with the original text,
        // so we can't URL parse it. This isn't critical logic, though, so we just
        // naively split
        const protocol = url.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//)?.[0] ?? "";
        const domainAndPort = url.slice(protocol.length).split("/")[0] ?? "";
        const pathAndQuery = url.slice(protocol.length + domainAndPort.length);
        const port = domainAndPort.match(/:\d+$/)?.[0] ?? "";
        const domain = domainAndPort.slice(0, domainAndPort.length - port.length);
        const query =
            pathAndQuery.includes("?") ? pathAndQuery.slice(pathAndQuery.indexOf("?")) :
            pathAndQuery.includes("#") ? pathAndQuery.slice(pathAndQuery.indexOf("#")) :
            "";
        const path = pathAndQuery.slice(0, pathAndQuery.length - query.length);
        return { protocol, domain, port, path, query };
    }
</script>

{#snippet url(parts: ReturnType<typeof parseUrl>)}
    <span class="url-protocol">{parts.protocol}</span><!--
    --><span class="url-domain">{parts.domain}</span><!--
    --><span class="url-port">{parts.port}</span><!--
    --><span class="url-path">{parts.path}</span><!--
    --><span class="url-query">{parts.query}</span>
{/snippet}

<div class="url-input-container">
    {#if !isEditing}
        <a href={value} target="_blank" rel="noopener noreferrer" class="url-display">
            {#if value}
                {@const urlParts = parseUrl(value)}
                <img 
                    src={getFaviconUrl(value)} 
                    alt="Favicon" 
                    class="favicon"
                    onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                />
                <span class="url-text">{@render url(urlParts)}</span>
                <ExternalLink />
            {:else}
                <span class="placeholder">No URL</span>
            {/if}
        </a>
        <button class="edit-button" aria-label="Edit URL" onclick={handleEdit}>
            <Pencil />
        </button>
    {:else}
        {@const urlParts = parseUrl(tempValue)}
        <div
            class="url-edit-bar input"
        >
            <span class="highlight">{@render url(urlParts)}</span>

            <!-- svelte-ignore a11y_autofocus -->
            <input
                class="unstyled"
                type="url"
                onkeydown={handleKeyDown}
                bind:value={tempValue}
                placeholder="Enter URL"
                autofocus
                onscroll={(e) => {
                    const input = e.currentTarget as HTMLInputElement;
                    const highlight = input.previousElementSibling as HTMLElement;
                    highlight.scrollLeft = input.scrollLeft;
                }}
            />
        </div>
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

        .url-protocol, .url-query {
            color: color-mix(in srgb, currentColor, transparent 20%);
        }
    }
    button {
        padding: 0.25rem;
        margin: -0.25rem 0;
    }

    .url-edit-bar {
        position: relative;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        font-size: 0.875rem;
        line-height: 1;
        white-space: nowrap;
        gap: 0;
        padding: 0;
        margin: -0.25rem 0;

        input {
            position: absolute;
            inset: 0;
            
            color: transparent;
            caret-color: var(--text-primary);
            overscroll-behavior: none;
            padding: 0.25rem 0.5rem;
        }

        .highlight, input {
            font-size: inherit;
            line-height: inherit;
            font-family: inherit;
            margin: 0;
            text-align: left;
        }
    
        .highlight {
            pointer-events: none;
            user-select: none;
            overflow-x: hidden;
            padding: 0.25rem 0.5rem;

            &::before {
                content: "";
                display: inline-block;
            }
        }
        .url-protocol, .url-port, .url-path {
            color: var(--text-secondary);
        }
        .url-query {
            color: var(--text-tertiary);
        }
        .url-domain {
            color: var(--text-primary);
            font-weight: 500;
        }
    }
</style>