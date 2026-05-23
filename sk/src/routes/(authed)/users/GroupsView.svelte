<script lang="ts">
    import ModalPanel from "$lib/components/ModalPanel.svelte";
    import { save, type PageStore } from "$lib/pocketbase";
    import { Collections, type GroupsRecord, type GroupsResponse } from "$lib/pocketbase/generated-types";
    import Paginator from "$lib/pocketbase/Paginator.svelte";
    import { Pencil, Plus, Trash } from "lucide-svelte";
    import GroupEditView from "./GroupEditView.svelte";

    const { groups }: {
        groups: PageStore<GroupsResponse>
    } = $props();

    const fakeGroupsData = new Array(40).fill(0).map((_, i) => ({
        id: `group${i + 1}`,
        name: `Group ${i + 1}`,
        description: `This is group ${i + 1}`
    } as GroupsRecord));

    let showingGroup: string | null = $state(null);
</script>

<ModalPanel open={showingGroup !== null} onclose={() => showingGroup = null}>
    {@const group = fakeGroupsData.find(g => g.id === showingGroup)}
    {#if group}
        <GroupEditView {group} />
    {/if}
</ModalPanel>

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
            <!-- {#each $groups.items as group} -->
            {#each fakeGroupsData as group}
                {@const onclick = () => showingGroup = group.id}
                <tr ondblclick={onclick}>
                    <td class="button-row">
                        <button {onclick}>
                            <span>{group.name}</span>
                            <span>todo</span>
                        </button>
                    </td>
                    <td class="actions">
                        <button {onclick} title="Edit group">
                            <Pencil />
                        </button>
                        <button class="delete" onclick={() => alert("Not implemented yet")} title="Delete group">
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

table {
    grid-template-columns: 1fr 1fr min-content;
}

.group {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .group-name {
        font-size: var(--font-large);
        padding: 0.5rem 0.75rem;
    }

    h3 {
        margin-top: 0.5rem;
        font-size: var(--font-medium);
    }
}
</style>