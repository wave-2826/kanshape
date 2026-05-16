<script lang="ts">
    import "../../app.scss";
    import { page } from "$app/state";
    import { metadata } from "$lib/metadata";
    import { onMount } from "svelte";
    import { client } from "$lib/pocketbase";
    import { goto } from "$app/navigation";
    import { ExternalLink, LogOut, PanelRightClose, PanelRightOpen } from 'lucide-svelte';
    import NavContent from "$lib/components/NavContent.svelte";
    import { setConfig } from "$lib/config";

    const { data, children } = $props();
    const config = $derived(data.config ?? {});
    // svelte-ignore state_referenced_locally
    setConfig(config);

    $effect(() => {
        if(page.error) $metadata.title = `Error: ${page.error.message}`;
    });

    // Client-side redirect to /login if not authenticated
    onMount(() => {
        if(typeof window !== "undefined") {
            const isLoginPage = page.url.pathname.startsWith("/login");
            const followPath = page.url.pathname;
            if(!client.authStore.isValid && !isLoginPage) goto("/login?r=" + encodeURIComponent(followPath));
        }
    });

    let navOpen = $state(true)
    const onOnshape = $derived(page.route.id?.startsWith("/(authed)/(onshape)") ?? false);
    let showNav = $derived(!onOnshape && (navOpen || page.url.pathname === "/"));
</script>

<svelte:head>
<link rel="icon" href="{config.site.faviconUrl}" />
<title>{$metadata.title} - {config.site.name}</title>
</svelte:head>

<div class="layout" class:showNav={showNav}>
    <header class="container">
        {#if onOnshape}
            <button onclick={() => window.open(window.location.origin, "_blank")}>
                <ExternalLink />
            </button>
        {:else}
            <button onclick={() => navOpen = !navOpen}>
                {#if navOpen}
                    <PanelRightClose />
                {:else}
                    <PanelRightOpen />
                {/if}
            </button>
        {/if}
        {#if config.site.logoUrl}
            <img src={config.site.logoUrl} alt={config.site.name} />
        {/if}
        <a href="/">
            <h1>{config.site?.name}</h1>
        </a>
        <div style="flex-grow: 1;"></div>
        <button onclick={() => {
            client.authStore.clear();
            goto("/login");
        }}>
            <LogOut />
        </button>
    </header>
    {#if !onOnshape}
        <nav>
            <div class="nav-content">
                <NavContent />
            </div>
        </nav>
    {/if}
    <main>
        {@render children()}
    </main>
</div>

<style lang="scss">
.layout {
    --open-nav-width: 250px;

    display: grid;
    grid-template-areas:
        "header header"
        "nav main";
    grid-template-columns: 0px 1fr;
    grid-template-rows: auto 1fr;
    height: 100vh;
    max-height: 100vh;

    transition: grid-template-columns 0.1s ease;
    &.showNav {
        grid-template-columns: var(--open-nav-width) 1fr;
    }
}
header {
    grid-area: header;
    display: flex;
    justify-content: flex-start;
    align-items: center;

    padding: 0 0.5rem;
    gap: 0.5rem;

    height: 2.25rem;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border);

    img {
        height: 2rem;
        margin-right: 1rem;
    }
    a, h1 {
        color: var(--text-primary);
        text-decoration: none;
    }
    button {
        --bg-color: transparent;
        padding: 0.25rem;
        width: 1.75rem;
    }
}
nav {
    grid-area: nav;
    background-color: var(--bg-primary);
    overflow: hidden;
}
.nav-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem;
    font-size: var(--font-text);

    width: var(--open-nav-width);
    height: 100%;
}
main {
    grid-area: main;
    flex-grow: 1;
    font-size: var(--font-text);
    
    overflow: hidden;
}
</style>
