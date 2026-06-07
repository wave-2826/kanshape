<script lang="ts">
    import { nav } from "$lib/navigation";
    import { onshapeOAuth } from "$lib/onshape/oauth";
    import { watchOne, type ExpandRecord } from "$lib/pocketbase";
    import { authModel, logout } from "$lib/pocketbase/auth";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { deasyncify } from "$lib/util";
    import { LogOut } from "lucide-svelte";
    import type { Readable } from "svelte/store";

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
            <dd>{($fullModel?.expand.groups?.map(g => g.name) ?? []).join(", ") || "None"}</dd>
            <dt>Onshape OAuth</dt>
            {@debug $fullModel}
            {#if $fullModel?.onshape_auth_expiry}
                {#if new Date($fullModel?.onshape_auth_expiry ?? 0) > new Date()}
                    <dd class="connected">Connected</dd>
                {:else}
                    <dd class="expired">Connected</dd>
                {/if}
            {:else}
                <dd class="disconnected">Not connected</dd>
            {/if}
            <!-- <dd>{($authModel.onshapeId ? "Connected" : "Not connected")}</dd> -->
        </dl>

        {#if $fullModel && !$fullModel.onshape_auth_expiry}
            <button onclick={() => onshapeOAuth()}>
                <!-- TODO: we can store this ourselves -->
                <img src="https://www.google.com/s2/favicons?domain=onshape.com&sz=32" alt="Onshape" width="16" height="16" />
                Auth with Onshape
            </button>
        {/if}

        <button onclick={async () => {
            await logout();
            await nav("/login");
        }}>
            <LogOut /> Sign out
        </button>
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
</style>