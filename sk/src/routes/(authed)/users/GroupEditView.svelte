<script lang="ts">
    import { query } from "$lib/pocketbase";
    import BlockSelector from "$lib/pocketbase/BlockSelector.svelte";
    import { Collections, type GroupsRecord, type UsersRecord } from "$lib/pocketbase/generated-types";

    const { group }: {
        group: GroupsRecord
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
    })
    // await query(Collections.Users, {
    //     filter: `groups ~ "${group.id}"`
    // });
</script>

<div class="group">
    <input type="text" value={group.name} class="group-name" placeholder="Group name"/>
    <textarea value={group.description} class="group-description" placeholder="Group description"></textarea>

    <h3>Members</h3>
    <BlockSelector
        values={members ? members.map(m => ({ id: m.id, name: m.name ?? m.username })) : []}
        onchange={(ids) => alert("Not implemented yet")}
        collection={Collections.Users}
    />
</div>