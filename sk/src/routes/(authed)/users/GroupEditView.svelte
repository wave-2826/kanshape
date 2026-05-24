<script lang="ts">
    import { query } from "$lib/pocketbase";
    import BlockSelector from "$lib/pocketbase/BlockSelector.svelte";
    import { Collections, type GroupOverviewRecord, type UsersRecord } from "$lib/pocketbase/generated-types";
    import { Trash } from "lucide-svelte";

    const { group, ondelete }: {
        group: GroupOverviewRecord,
        ondelete: () => void
    } = $props();

    let members: UsersRecord[] | null = $state(null);
    let lastId: string | null = null;
    async function queryGroupMembers() {
        members = await query(Collections.Users, {
            filter: `groups ~ "${group.id}"`
        });
    }
    $effect(() => {
        if(group.id !== lastId) {
            lastId = group.id;
            queryGroupMembers();
        }
    });
</script>

<div class="group">
    <div class="content">
        <input type="text" value={group.name} class="group-name" placeholder="Group name"/>
        <textarea value={group.description} class="group-description" placeholder="Group description"></textarea>

        <h3>Cards ({group.card_count as number})</h3>
        <!-- TODO -->
        <p>{group.card_count as number} cards assigned. nag us if you want a list here I guess</p>

        <h3>Members ({members?.length ?? 0})</h3>
        <BlockSelector
            values={members ? members.map(m => ({ id: m.id, name: m.name ?? m.username })) : []}
            saveToRelation={["groups", group.id]}
            searchField="name"
            onchange={async (ids) => {
                queryGroupMembers();
            }}
            collection={Collections.Users}
        />
    </div>

    <hr />

    <footer>
        <button onclick={ondelete} class="delete"><Trash /> Delete Group</button>
    </footer>
</div>

<style lang="scss">
.content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    overflow-y: auto;

    .group-name {
        font-size: var(--font-large);
        padding: 0.5rem 0.75rem;
    }

    h3 {
        margin-top: 0.5rem;
        font-size: var(--font-medium);
    }
}

footer {
    display: flex;
    justify-content: flex-end;

    button.delete {
        color: var(--error);
        --bg-color: transparent;
        padding: 0.5rem 1rem;
    }
}
</style>