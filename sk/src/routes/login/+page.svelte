<script lang="ts">
import { onMount } from "svelte";
import { client } from "$lib/pocketbase";
import { goto } from "$app/navigation";
import type { AuthProviderInfo } from "pocketbase";

let providers: AuthProviderInfo[] = $state([]);
let error = $state("");

onMount(async () => {
    try {
        // Get OIDC providers from PocketBase
        const res = await client.send("/api/collections/users/auth-methods", {});
        providers = (res?.authProviders ?? []).filter((p: AuthProviderInfo) => p.name !== "password");
    } catch(e: any) {
        error = `Failed to load login providers: ${e.message}`;
    }
});

async function loginWithProvider(provider: AuthProviderInfo) {
    try {
        const authData = await client.collection("users").authWithOAuth2({ provider: provider.name });
        if(authData?.token) goto("/");
    } catch(e: any) {
        error = `Login failed: ${e.message}`;
    }
}
</script>

<h1>Login</h1>

{#if error}
    <p>{error}</p>
{/if}
{#if providers.length === 0}
    <p>Loading providers...</p>
{:else}
    <ul>
        {#each providers as provider}
            <li>
                <button onclick={() => loginWithProvider(provider)}>
                    Login with {provider.displayName || provider.name}
                </button>
            </li>
        {/each}
    </ul>
{/if}

<style lang="scss">

</style>