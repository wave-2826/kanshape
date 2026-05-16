<script lang="ts">
    import "../../app.scss";
    import { page } from "$app/state";
    import { metadata } from "$lib/metadata";
    import { onMount } from "svelte";
    import { client } from "$lib/pocketbase";
    import { goto } from "$app/navigation";
    import { ListMinus, ListPlus, LogOut, Menu } from 'lucide-svelte';
    import NavContent from "$lib/components/NavContent.svelte";

    const { data, children } = $props();
    const config = $derived(data.config ?? {});

    $effect(() => {
        if(page.error) $metadata.title = `Error: ${page.error.message}`;
    });

    // Client-side redirect to /login if not authenticated
    onMount(() => {
        if(typeof window !== "undefined") {
            const isLoginPage = page.url.pathname.startsWith("/login");
            if(!client.authStore.isValid && !isLoginPage) goto("/login");
        }
    });

    let navOpen = $state(true);
    let showNav = $derived(navOpen || page.url.pathname === "/");
</script>

<svelte:head>
<link rel="icon" href="{config.site.faviconUrl}" />
<title>{$metadata.title} - {config.site.name}</title>
</svelte:head>

<div class="layout" class:showNav={showNav}>
    <header class="container">
        <button onclick={() => navOpen = !navOpen}>
            {#if navOpen}
                <ListMinus />
            {:else}
                <ListPlus />
            {/if}
        </button>
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
    <nav>
        <div class="nav-content">
            <NavContent />
        </div>
    </nav>
    <main>
        {@render children()}
    </main>
</div>

<style lang="scss">
.layout {
    --open-nav-width: 300px;

    display: grid;
    grid-template-areas:
        "header header"
        "nav main";
    grid-template-columns: 0px 1fr;
    grid-template-rows: auto 1fr;
    height: 100vh;

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
    gap: 1rem;

    height: 2.5rem;
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
        padding: 0.5rem;
        display: grid;
        place-items: center;
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
    gap: 0.5rem;
    padding: 0.5rem;

    width: var(--open-nav-width);
    height: 100%;
}
main {
    grid-area: main;
    flex-grow: 1;
    padding: 1rem;
    
    overflow-y: auto;
}
</style>
