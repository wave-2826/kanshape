<script lang="ts">
    import { authModel } from "$lib/pocketbase/auth";
    import { User } from "lucide-svelte";
    import { client } from "$lib/pocketbase";
</script>

<div class="nav-profile" title="Name or avatar changed? Sign out and back in to refresh.">
    {#if $authModel}
        {#if $authModel.avatar}
            <img class="avatar" src={client.files.getUrl($authModel, $authModel.avatar, { thumb: '100x100' })} alt="Avatar" />
        {:else}
            <div class="avatar fallback">
                <User />
            </div>
        {/if}
        <span class="name">{$authModel.name || $authModel.email || "Unknown User"}</span>
    {/if}
</div>

<style lang="scss">
    .nav-profile {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-primary);
        font-size: var(--font-text);
        padding: 0 0.5rem;
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
