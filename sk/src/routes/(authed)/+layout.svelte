<script module lang="ts">
    import { createContext } from "svelte";
    import { MediaQuery } from "svelte/reactivity";
    export type LayoutParams = {
        isMobile: boolean;
        onOnshape: boolean;
    };
    export const [getLayoutParams, setLayoutParams] = createContext<LayoutParams>();
</script>

<script lang="ts">
    import "../../app.scss";
    import { page } from "$app/state";
    import { metadata } from "$lib/metadata";
    import { onMount } from "svelte";
    import { goto, invalidateAll } from "$app/navigation";
    import { ExternalLink, LogOut, PanelRightClose, PanelRightOpen } from 'lucide-svelte';
    import NavContent from "$lib/components/NavContent.svelte";
    import { setConfig } from "$lib/config";
    import NavProfile from "$lib/components/NavProfile.svelte";
    import { dev } from "$app/environment";
    import { fade, slide } from "svelte/transition";
    import { authModel, logout } from "$lib/pocketbase/auth";

    const { data, children } = $props();
    const config = $derived(data.config ?? {});
    // svelte-ignore state_referenced_locally
    setConfig(config);

    $effect(() => {
        if(page.error) $metadata.title = `Error: ${page.error.message}`;
    });

    // Client-side redirect to /login if not authenticated
    onMount(() => {
        const followPath = page.url.pathname;
        if($authModel === null) goto("/login?r=" + encodeURIComponent(followPath));
    });

    const isMobile = $derived(new MediaQuery("screen and (max-width: 640px)").current);
    const onOnshape = $derived(page.route.id?.startsWith("/(authed)/(onshape)") || page.url.searchParams.get("onshape") === "true");
    let layoutParams = $state<LayoutParams>({
        // svelte-ignore state_referenced_locally
        isMobile,
        // svelte-ignore state_referenced_locally
        onOnshape
    });
    $effect(() => {
        layoutParams.isMobile = isMobile;
        layoutParams.onOnshape = onOnshape;
    });
    setLayoutParams(layoutParams);

    // svelte-ignore state_referenced_locally
    let navOpen = $state(!isMobile);

    const forceNavOpen = $derived(page.url.pathname === "/" && !isMobile);
    let showNav = $derived(!onOnshape && (navOpen || forceNavOpen));
</script>

<svelte:head>
<link rel="icon" href="{config.site.faviconUrl}" />
<title>{$metadata.title} - {config.site.name}</title>
</svelte:head>

<div class="layout" class:isMobile={isMobile}>
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
        {#if !isMobile}
            <a href="/">
                <h1>{config.site?.name}</h1>
            </a>
        {/if}
        <!-- Dev build warning -->
        {#if dev}
            <span class="dev-build-warning" title="This instance is running a development build">[DEV]</span>
        {/if}
        <div style="flex-grow: 1;"></div>
        <NavProfile />
        <button onclick={async () => {
            await logout();
            await goto("/login");
        }}>
            <LogOut />
        </button>
    </header>
    {#if isMobile && showNav}
        <button
            class="unstyled backdrop nav-backdrop"
            type="button"
            aria-label="Close navigation"
            onclick={() => navOpen = false}
            transition:fade={{ duration: 200 }}
        ></button>
    {/if}
    {#if showNav}
        <!-- TODO: layout shift while this transitions looks goofy -->
        <nav transition:slide={{ duration: 200, axis: isMobile ? "y" : "x" }}>
            <NavContent />
        </nav>
    {/if}
    <main>
        {@render children()}
    </main>
</div>

<style lang="scss">
.layout {
    --open-nav-width: 250px;
    --header-height: 2.25rem;

    display: grid;
    grid-template-areas:
        "header header"
        "nav main";
    grid-template-columns: auto 1fr;
    grid-template-rows: auto 1fr;
    height: 100dvh;
    max-height: 100dvh;

    > * {
        min-width: 0;
        overflow: hidden;
    }
}
header {
    grid-area: header;
    display: flex;
    justify-content: flex-start;
    align-items: center;

    padding: 0 0.5rem;
    gap: 0.5rem;

    height: var(--header-height);
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
    .dev-build-warning {
        color: var(--error);
        font-size: 0.75rem;
        font-weight: bold;
        margin-left: 0.5rem;
    }
    button {
        padding: 0.25rem;
        width: 1.75rem;
        -webkit-appearance: none;
        appearance: none;
        -webkit-tap-highlight-color: transparent;
    }
}
nav {
    grid-area: nav;
    background-color: var(--bg-primary);
    overflow: hidden; // Internal areas scroll, but not the whole nav

    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem;
    font-size: var(--font-text);

    width: var(--open-nav-width);
}
.nav-backdrop {
    position: fixed;
    inset: var(--header-height) 0 0 0;
    z-index: 999;
    border: 0;
    padding: 0;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    -webkit-tap-highlight-color: transparent;
}

main {
    grid-area: main;
    flex-grow: 1;
    font-size: var(--font-text);
    
    overflow: hidden;
}

@media (max-width: 640px) {
    .layout {
        grid-template-columns: 1fr !important;
        grid-template-areas:
            "header"
            "nav"
            "main";
        grid-template-rows: auto 0 1fr;
    }

    nav {
        width: 100%;
        overflow: auto;
        max-height: 70dvh;

        position: absolute;
        z-index: 1000;
        top: var(--header-height);
    }
}

</style>