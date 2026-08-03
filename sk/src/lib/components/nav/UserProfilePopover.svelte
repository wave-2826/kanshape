<script lang="ts">
    import { nav } from "$lib/navigation";
    import { onshapeOAuth } from "$lib/onshape/oauth";
    import { watchOne, type ExpandRecord } from "$lib/pocketbase";
    import { authModel, logout } from "$lib/pocketbase/auth";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { deasyncify } from "$lib/util";
    import { LogOut } from "@lucide/svelte";
    import type { Readable } from "svelte/store";
    import ThemeSelector from "./ThemeSelector.svelte";

    type EnrichedUser = ExpandRecord<"users", "groups"> & {
        onshape_auth_expiry?: string;
    };

    // We need to fetch the full model for two reasons:
    // - PB doesn't run enrichment on the default auth store, which we need for Onshape OAuth state
    // - We want to show the user's groups, which requires `expand`ing the relations
    const fullModel = $derived<Readable<EnrichedUser> | null>(
        $authModel ? deasyncify(watchOne(Collections.Users, $authModel.id, { expand: "groups" })) as Readable<EnrichedUser> : null
    );
</script>

{#if $authModel}
    <div class="profile">
        <h2>{$authModel.name || $authModel.email || "Unknown User"}</h2>
        <dl>
            <dt>Email</dt>
            <dd>{$authModel.emailVisibility ? $authModel.email : "Hidden"}</dd>
            <dt>Account created</dt>
            <dd>{new Date($authModel.created).toLocaleDateString()}</dd>
            <dt>Groups</dt>
            <dd>{$fullModel ?
                    ($fullModel.expand.groups?.map(g => g.name) ?? []).join(", ") || "None" :
                    $authModel.groups.length
            }</dd>
            {#if $fullModel?.onshape_auth_expiry}
                <dt>Onshape OAuth</dt>
                {#if new Date($fullModel?.onshape_auth_expiry ?? 0) > new Date()}
                    <dd class="connected">Connected</dd>
                {:else}
                    <dd class="expired">Connected</dd>
                {/if}
            {:else if $fullModel}
                <dt>Onshape OAuth</dt>
                <dd class="disconnected">Not connected</dd>
            {/if}
            {#if $authModel.is_admin}
                <dt>Admin</dt>
                <dd class="admin">Yes</dd>
            {/if}
        </dl>

        {#if $fullModel && !$fullModel.onshape_auth_expiry}
            <button onclick={() => onshapeOAuth()}>
                <img src="/onshape.png" alt="Onshape" width="16" height="16" />
                Auth with Onshape
            </button>
        {/if}

        <button onclick={async () => {
            await logout();
            await nav("/login");
        }}>
            <LogOut /> Sign out
        </button>

        <ThemeSelector />
    </div>
{/if}

<style lang="scss">

.profile {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;

    h2 {
        font-size: var(--font-large);
        margin: 0;
    }

    dl {
        margin: 0;
        gap: 0 0.5rem;
        font-size: var(--font-small);
        display: grid;
        grid-template-columns: max-content 1fr;
        color: var(--text-secondary);

        dt {
            font-weight: bold;
        }
    }
}

.connected { color: var(--success); }
.expired { color: var(--warning-medium); }
.disconnected { color: var(--error); }
.admin { color: var(--success); }
</style>