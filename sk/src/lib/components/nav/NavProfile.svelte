<script lang="ts">
    import { authModel, logout } from "$lib/pocketbase/auth";
    import { LogOut, User } from "lucide-svelte";
    import { client } from "$lib/pocketbase";
    import { nav } from "$lib/navigation";

    const { collapsed }: { collapsed?: boolean } = $props();
</script>

{#if $authModel}
    <!-- TODO: better hint than title text, especially for when collapsed -->
    <div class="nav-profile" title="{$authModel.name || $authModel.email || "Unknown User"}
Name or avatar changed? Sign out and back in to refresh.">
        {#if $authModel.avatar}
            <img class="avatar" src={client.files.getUrl($authModel, $authModel.avatar, { thumb: '100x100' })} alt="Avatar" />
        {:else}
            <div class="avatar fallback">
                <User />
            </div>
        {/if}
        {#if !collapsed}
            <span class="name">{$authModel.name || $authModel.email || "Unknown User"}</span>
            <button onclick={async () => {
                await logout();
                await nav("/login");
            }}>
                <LogOut />
            </button>
        {/if}
    </div>
{/if}

<style lang="scss">
.nav-profile {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-primary);
    font-size: var(--font-text);
}

.avatar {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;

    &.fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--bg-secondary);

        :global(svg) {
            width: 1.1em;
            height: 1.1em;
            color: var(--text-secondary);
        }
    }
}

.name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
}
</style>
