<script lang="ts">
    import { getOnshapeContext } from "$lib/components/nav/onshapeContext.svelte";
    import { onshapeOAuth } from "$lib/onshape/oauth";
    import { authModel } from "$lib/pocketbase/auth";
    import type { UsersResponse } from "$lib/pocketbase/generated-types";
    import type { Snippet } from "svelte";
    
    const { children }: { children: Snippet } = $props();

    const oauth = $derived(($authModel as UsersResponse & {
        onshape_auth_expiry?: string;
    } | null)?.onshape_auth_expiry);
    const documentId = $derived(getOnshapeContext().documentId);
</script>

{#if !documentId}
    <div class="container">
        <p>Missing Onshape parameters. Are you accessing this page directly?</p>
    </div>
{:else if !oauth}
    <div class="container">
        <p>You must authenticate with Onshape before using document features.</p>
        <button onclick={() => onshapeOAuth()}>
            <!-- TODO: we can store this ourselves -->
            <img src="https://www.google.com/s2/favicons?domain=onshape.com&sz=32" alt="Onshape" width="16" height="16" />
            Auth with Onshape
        </button>
    </div>
{:else}
    {@render children()}
{/if}

<style lang="scss">
.container {
    display: flex;
    flex-direction: column;
    padding: 2rem;
    gap: 1rem;
}
</style>