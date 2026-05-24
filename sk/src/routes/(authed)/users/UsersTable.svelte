<script lang="ts">
    import ModalPanel from "$lib/components/ModalPanel.svelte";
    import { deleteRecord, type ExpandResponse, type PageStore } from "$lib/pocketbase";
    import Paginator from "$lib/pocketbase/Paginator.svelte";
    import { Pencil, Trash } from "lucide-svelte";
    import UsersEditView from "./UsersEditView.svelte";
    import { Collections } from "$lib/pocketbase/generated-types";

    const { users }: {
        users: PageStore<ExpandResponse<"users", "groups">>
    } = $props();

    let showingUser: string | null = $state(null);

    function deleteUser(user: ExpandResponse<"users", "groups">) {
        if(confirm(`Are you sure you want to delete the user "${user.username}"? This action cannot be undone.`)) {
            deleteRecord(Collections.Users, user.id).catch(e => console.error("Failed to delete user:", e));
        }
    }
</script>

<ModalPanel open={showingUser !== null} onclose={() => showingUser = null}>
    {@const user = $users.items.find(g => g.id === showingUser)}
    {#if user}
        <UsersEditView {user} ondelete={() => deleteUser(user)} />
    {/if}
</ModalPanel>

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
                <tr ondblclick={() => showingUser = user.id}>
                    <td class="button-row">
                        <button onclick={() => showingUser = user.id}>
                            <span>{user.username}</span>
                            <span>{user.name}</span>
                            <span class:empty={user.groups?.length === 0}>
                                {#if !user.expand.groups || user.expand.groups?.length === 0}
                                    No groups
                                {:else if user.expand.groups.length <= 2}
                                    {user.expand.groups.map((g) => g.name).join(", ")}
                                {:else}
                                    {user.expand.groups[0].name}, +{user.expand.groups.length - 1} more
                                {/if}
                            </span>
                            <span class="admin" class:active={user.is_admin}>
                                {user.is_admin ? "Yes" : "No"}
                            </span>
                        </button>
                    </td>
                    <td class="actions">
                        <button onclick={() => showingUser = user.id} title="Edit user">
                            <Pencil />
                        </button>
                        <button class="delete" onclick={() => deleteUser(user)} title="Delete user">
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
span {
    min-width: 0;
    text-overflow: ellipsis;
    overflow: hidden;
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