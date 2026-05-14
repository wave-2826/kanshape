<script lang="ts">
    import "../../app.scss";
    import { page } from "$app/state";
    import { metadata } from "$lib/metadata";
    import { onMount } from "svelte";
    import { client } from "$lib/pocketbase";
    import { goto } from "$app/navigation";
    import { LogOut } from 'lucide-svelte';

    const { data, children } = $props();
    const config = $derived(data.config ?? {});

    $effect(() => {
        if(page.error) $metadata.title = `Error: ${page.error.message}`;
    });

    // Client-side redirect to /login if not authenticated
    onMount(() => {
        if(typeof window !== "undefined") {
            const isLoginPage = window.location.pathname.startsWith("/login");
            if(!client.authStore.isValid && !isLoginPage) goto("/login");
        }
    });
</script>

<svelte:head>
<title>{$metadata.title} - {config.site?.name}</title>
</svelte:head>

<header class="container">
    <!-- ... -->
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
<main class="container">
    {@render children()}
</main>

<style lang="scss">
header {
    display: flex;
    justify-content: flex-start;
    align-items: center;

    padding: 0 1rem;

    height: 3rem;
    background-color: var(--bg-primary);

    img {
        height: 2.5rem;
        margin-right: 2rem;
    }
    a, h1 {
        font-size: 1.5rem;
        margin: 0;
        color: var(--text-primary);
        text-decoration: none;
    }

    button {
        --bg-color: transparent;
    }
}
main {
    flex-grow: 1;
}
</style>
