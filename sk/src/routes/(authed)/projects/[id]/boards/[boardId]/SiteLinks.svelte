<script lang="ts">
    import { getConfig } from "$lib/config";
    import type { ProjectLinkedSite } from "$lib/data/project";

    const {
        links
    }: {
        links: ProjectLinkedSite[];
    } = $props();

    const config = getConfig();

    function getIconURL(hostname: string, icon: string | undefined): string {
        if(icon === "site") {
            return config.site.faviconUrl;
        } else if(icon) {
            return icon;
        } else {
            return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
        }
    }
</script>

{#each links as link}
    {@const hostname = new URL(link.url).hostname}
    <span class="link-badge button">
        <a href={link.url} target="_blank" rel="noopener noreferrer">
            <img src={getIconURL(hostname, link.icon)} alt={link.name ? link.name : hostname} width="16" height="16" />
            {link.name ? link.name : hostname}
        </a>
    </span>
{/each}

<style lang="scss">
@use "./linkBadge.scss";
</style>