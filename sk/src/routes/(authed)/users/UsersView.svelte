<script lang="ts">
    import type { PageStore } from "$lib/pocketbase";
    import type { UsersResponse } from "$lib/pocketbase/generated-types";
    import Paginator from "$lib/pocketbase/Paginator.svelte";
    import { Pencil, Trash } from "lucide-svelte";

    const { users }: {
        users: PageStore<UsersResponse>
    } = $props();
</script>

{#if $users.items.length === 0}
    <p>No users (??? how are you here)</p>
{:else}
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Groups</th>
                <th>Admin</th>
            </tr>
        </thead>
        <tbody>
            {#each $users.items as user}
                <tr>
                    <td>{user.name}</td>
                    <td>{user.emailVisibility ? user.email : "Email hidden"}</td>
                    <td>{user.groups?.join(", ") || "No groups"}</td>
                    <td>{user.is_admin ? "Yes" : "No"}</td>
                    <td class="actions">
                        <button onclick={() => alert("Not implemented yet")} title="Edit user">
                            <Pencil />
                        </button>
                        <button onclick={() => alert("Not implemented yet")} title="Delete user">
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
table {
    overflow-y: auto;
}
th {
    text-align: left;
}
p {
    padding: 1rem;
    text-align: center;
    color: var(--text-secondary);
}

.actions {
    display: flex;
    gap: 0.25rem;

    button {
        --bg-color: transparent;
        padding: 0.25rem;
    }
}
</style>