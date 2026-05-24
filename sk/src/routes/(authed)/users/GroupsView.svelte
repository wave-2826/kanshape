<script lang="ts">
    import ModalPanel from "$lib/components/ModalPanel.svelte";
    import { deleteRecord, save, type PageStore } from "$lib/pocketbase";
    import { Collections, type GroupOverviewRecord } from "$lib/pocketbase/generated-types";
    import Paginator from "$lib/pocketbase/Paginator.svelte";
    import { Pencil, Plus, Trash } from "lucide-svelte";
    import GroupEditView from "./GroupEditView.svelte";

    const { groups }: {
        groups: PageStore<GroupOverviewRecord>
    } = $props();

    let showingGroup: string | null = $state(null);

    async function deleteGroup(group: GroupOverviewRecord) {
        // First, check if any users are assigned to this group
        if(group.member_count as number > 0) {
            if(!confirm(`There are ${group.member_count} users assigned to this group. Are you sure you want to delete it?`)) {
                return;
            }
        }

        // Check if there are any cards assigned to this group
        if(group.card_count as number > 0) {
            if(!confirm(`There are ${group.card_count} cards assigned to this group. Are you sure you want to delete it?`)) {
                return;
            }
        }

        // if(confirm(`Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`)) {
        //     groups.delete(group.id).catch(e => console.error("Failed to delete group:", e));
        // }

        try {
            await deleteRecord(Collections.Groups, group.id);
            if(showingGroup === group.id) showingGroup = null;
        } catch(e) {
            console.error("Failed to delete group:", e);
        }
    }
</script>

<ModalPanel open={showingGroup !== null} onclose={() => showingGroup = null}>
    {@const group = $groups.items.find(g => g.id === showingGroup)}
    {#if group}
        <GroupEditView {group} ondelete={() => deleteGroup(group)} />
    {/if}
</ModalPanel>

{#if $groups.items.length === 0}
    <p>No groups found.</p>
{:else}
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th class="stats-title">Users / cards</th>
            </tr>
        </thead>
        <tbody>
            {#each $groups.items as group}
                {@const onclick = () => showingGroup = group.id}
                <tr ondblclick={onclick}>
                    <td class="button-row">
                        <button {onclick}>
                            <span>{group.name}</span>
                            <span class="stats">{group.member_count} / {group.card_count}</span>
                        </button>
                    </td>
                    <td class="actions">
                        <button {onclick} title="Edit group">
                            <Pencil />
                        </button>
                        <button class="delete" onclick={() => deleteGroup(group)} title="Delete group">
                            <Trash />
                        </button>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}
<button onclick={() => save(Collections.Groups, {
    name: "New Group"
}, { create: true })}>
    <Plus />
    Create group
</button>
<Paginator store={groups} />

<!-- svelte-ignore css_unused_selector - Shared stylesheet -->
<style lang="scss">
@use "./users.scss";

.stats {
    font-size: var(--font-tiny);
    color: var(--text-secondary);
}
.stats-title {
    grid-column: span 2;
}
table {
    grid-template-columns: 1fr 4rem min-content;
}
</style>