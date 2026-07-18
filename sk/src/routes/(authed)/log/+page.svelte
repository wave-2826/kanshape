<script lang="ts">
    import { client, watch } from "$lib/pocketbase";
    import { authModel } from "$lib/pocketbase/auth";
    import { Collections } from "$lib/pocketbase/generated-types";
    import Paginator from "$lib/pocketbase/Paginator.svelte";
    import { Trash } from "lucide-svelte";
    import ActivityEntry from "./ActivityEntry.svelte";

    const changes = $derived(await watch(Collections.ActivityLogPreview, {
        sort: "-date"
    }, 0, 50, {
        pollOnChange: [Collections.ActivityLog]
    }));
</script>

<div class="page">
    {#if changes}
        <header>
            <p class="entry-count">{$changes.items.length} of {$changes.totalItems} activity entries</p>
            <Paginator store={changes} showIfSinglePage />
            {#if $authModel?.is_admin}
                <button onclick={() => {
                    if(confirm(`Are you sure you want to delete ${$changes.totalItems} activity log entries? This action cannot be undone.`)) {
                        client.send("/api/clear_activity_log", {
                            method: "POST"
                        }).catch((err) => {
                            console.error("Failed to clear activity log:", err);
                            alert("Failed to clear activity log.");
                        });
                    }
                }} class="clear-log"><Trash class={$css("icon")} /> Clear log</button>
            {/if}
        </header>
        {#if $changes.items.length > 0}
            {#each $changes.items as change}
                <ActivityEntry entry={change} />
            {/each}
        {:else}
            <p>No activity found.</p>
        {/if}
        <Paginator store={changes} showIfSinglePage />
    {:else}
        <p>No activity found.</p>
    {/if}
</div>

<style lang="scss">
.page {
    display: flex;
    height: 100%;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    overflow-y: auto;
}

header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;
    gap: 0.5rem;

    .entry-count {
        font-size: var(--font-small);
        font-style: italic;
        color: var(--text-tertiary);
    }

    button {
        justify-self: end;
        color: var(--error);

        .icon {
            width: 1em;
            height: 1em;
        }
    }
}

p {
    font-size: var(--font-small);
    color: var(--text-secondary);
}
</style>