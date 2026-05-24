<script lang="ts">
    import type { ExpandResponse, PageStore } from "$lib/pocketbase";
    import Paginator from "$lib/pocketbase/Paginator.svelte";
    import { Pencil, Trash } from "lucide-svelte";

    const { users }: {
        users: PageStore<ExpandResponse<"users", "groups">>
    } = $props();
</script>

{#if $users.items.length === 0}
    <p>No users (??? how are you here)</p>
{:else}
    <table>
        <thead>
            <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Groups</th>
                <th>Admin</th>
            </tr>
        </thead>
        <tbody>
            {#each $users.items as user}
                <tr>
                    <td class="button-row">
                        <button>
                            <span>{user.username}</span>
                            <span>{user.name}</span>
                            <span class:empty={user.groups?.length === 0}>
                                {user.expand.groups?.map((g) => g.name).join(", ") || "No groups"}
                            </span>
                            <span class="admin" class:active={user.is_admin}>
                                {user.is_admin ? "Yes" : "No"}
                            </span>
                        </button>
                    </td>
                    <td class="actions">
                        <button onclick={() => alert("Not implemented yet")} title="Edit user">
                            <Pencil />
                        </button>
                        <button class="delete" onclick={() => alert("Not implemented yet")} title="Delete user">
                            <Trash />
                        </button>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}

<Paginator store={users} />

<style lang="scss">
@use "./users.scss";

table {
    grid-template-columns: 1fr 1.5fr 1fr 4rem min-content;
}

.empty {
    color: var(--text-secondary);
}
.admin {
    color: var(--text-secondary);
    &.active {
        color: var(--accent);
    }
}
</style>