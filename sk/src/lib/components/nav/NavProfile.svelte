<script lang="ts">
    import { authModel } from "$lib/pocketbase/auth";
    import { User } from "lucide-svelte";
    import { client } from "$lib/pocketbase";
    import PopoverButton from "../PopoverButton.svelte";
    import UserProfilePopover from "./UserProfilePopover.svelte";

    const { collapsed }: { collapsed?: boolean } = $props();
</script>

{#if $authModel}
    <div class="nav-profile">
        <!-- TODO: better hint than title text, especially for when collapsed -->
        <PopoverButton title="{$authModel.name || $authModel.email || "Unknown User"}
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
            {/if}

            {#snippet content()}
                <UserProfilePopover />
            {/snippet}
        </PopoverButton>
    </div>
{/if}

<style lang="scss">
.nav-profile {
    display: content;
    
    > :global(button) {
        --bg-color: transparent;
        height: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-primary);
        font-size: var(--font-text);
    }
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
