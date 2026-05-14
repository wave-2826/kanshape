<script lang="ts">
import "../../app.scss";
import { onMount } from "svelte";
import { client } from "$lib/pocketbase";
import type { AuthProviderInfo } from "pocketbase";
import { providerLogin } from "$lib/pocketbase/auth";
import { goto } from "$app/navigation";

const { data } = $props();

let providers: AuthProviderInfo[] = $state([]);
let error = $state("");

onMount(async () => {
    // If already logged in, redirect to home
    if(client.authStore.isValid) {
        goto("/");
        return;
    }

    try {
        // Get OIDC providers from PocketBase
        const res = await client.send("/api/collections/users/auth-methods", {});
        providers = (res?.authProviders ?? []).filter((p: AuthProviderInfo) => p.name !== "password");

        // If autologin is enabled, redirect to the provider immediately
        if(data.config.auth.autoOAuth !== null) {
            const autoProvider = providers.find(p => p.displayName === data.config.auth.autoOAuth);
            if(autoProvider) providerLogin(autoProvider, client.collection("users"));
            else error = `Auto-login provider "${data.config.auth.autoOAuth}" not found`;
        }
    } catch(e: any) {
        error = `Failed to load login providers: ${e.message}`;
    }
});
</script>

<header>
    {#if data.config.site.logoUrl}
        <img src={data.config.site.logoUrl} alt={data.config.site.name} />
    {/if}
</header>
<main>
    <h1>{data.config.site.name}</h1>
    
    {#if error}
        <p class="error">{error}</p>
    {/if}
    {#if providers.length === 0}
        <p>Loading providers...</p>
    {:else}
        <ul>
            {#each providers as provider}
                <li>
                    <button onclick={() => providerLogin(provider, client.collection("users"))}>
                        Login with {provider.displayName || provider.name}
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</main>

<style lang="scss">
header {
    padding: 1rem;
}
img {
    height: 4rem;
}

main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    height: 80vh;

    h1 {
        margin-bottom: 2rem;
        margin-top: -5rem;
    }
    p {
        color: var(--text-secondary);
        margin-bottom: 1rem;
    }
    ul {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
}

.error {
    color: var(--error);
}
</style>