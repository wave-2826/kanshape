<script lang="ts">
    import { query, save } from "$lib/pocketbase";
    import BlockSelector from "$lib/pocketbase/BlockSelector.svelte";
    import { Collections, type GroupOverviewRecord, type UsersRecord } from "$lib/pocketbase/generated-types";
    import { debounce } from "$lib/util";
    import { Trash } from "lucide-svelte";
    import { untrack } from "svelte";

    const { group, ondelete }: {
        group: GroupOverviewRecord,
        ondelete: () => void
    } = $props();

    // svelte-ignore state_referenced_locally
    let localGroup = $state(group);

    let members: UsersRecord[] | null = $state(null);
    let lastId: string | null = null;
    async function queryGroupMembers() {
        members = await query(Collections.Users, {
            filter: `groups ~ "${localGroup.id}"`
        });
    }

    // Update localgroup and re-query if group changes records, but not for normal
    // changes so we avoid an infinite update loop 
    $effect(() => {
        if(group.id !== lastId) {
            lastId = group.id;
            localGroup = group;

            queryGroupMembers();
        }
    });

    // Save changes to the group name and description when they are edited
    async function saveChanges() {
        try {
            await save(Collections.Groups, localGroup, { create: false });
        } catch(e) {
            console.error("Failed to save group changes:", e);
        }
    }
    const debouncedSaveChanges = debounce(saveChanges, 500);

    $effect(() => {
        if(JSON.stringify(untrack(() => group)) === JSON.stringify(localGroup)) {
            return;
        }
        JSON.stringify(localGroup); // Track all changes
        debouncedSaveChanges();
    });
</script>

<div class="group">
    <div class="content">
        <input type="text" bind:value={localGroup.name} class="group-name" placeholder="Group name"/>
        <textarea bind:value={localGroup.description} class="group-description" placeholder="Group description"></textarea>

        <h3>Cards ({localGroup.card_count as number})</h3>
        <!-- TODO -->
        <p>{localGroup.card_count as number} cards assigned. {localGroup.card_count as number > 0 ? "nag us if you want a list here I guess" : ""}</p>

        <h3>Members ({members?.length ?? 0})</h3>
        <BlockSelector
            values={members ? members.map(m => ({ id: m.id, name: m.name ?? m.username })) : []}
            saveToRelation={["groups", localGroup.id]}
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
.group {
    height: 100%;
    display: flex;
    flex-direction: column;
}

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