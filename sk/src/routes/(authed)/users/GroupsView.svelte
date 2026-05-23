<script lang="ts">
    import type { PageStore } from "$lib/pocketbase";
    import type { GroupsResponse } from "$lib/pocketbase/generated-types";
    import Paginator from "$lib/pocketbase/Paginator.svelte";
    import { Plus } from "lucide-svelte";

    const { groups }: {
        groups: PageStore<GroupsResponse>
    } = $props();
</script>

{#if $groups.items.length === 0}
    <p>No groups found.</p>
{:else}
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Members</th>
            </tr>
        </thead>
        <tbody>
            {#each $groups.items as group}
                <tr>
                    <td>{group.name}</td>
                    <td>todo</td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}
<button onclick={() => alert("Not implemented yet")}>
    <Plus />
    Create group
</button>
<Paginator store={groups} />

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
</style>