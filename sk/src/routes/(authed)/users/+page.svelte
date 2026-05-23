<script lang="ts">
    import { watch } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import GroupsView from "./GroupsView.svelte";
    import UsersView from "./UsersView.svelte";

    const groups = watch(Collections.Groups, {}, 0, 100);
    const users = watch(Collections.Users, {}, 0, 100);
</script>

<div class="page">
    <section style="flex: 1;">
        <h2>Groups</h2>
        <div class="content">
            {#await groups}
                <p>Loading groups...</p>
            {:then groups}
                <GroupsView {groups} />
            {/await}
        </div>
    </section>
    <section style="flex: 2;">
        <h2>Users</h2>
        <div class="content">
            {#await users}
                <p>Loading users...</p>
            {:then users}
                <UsersView {users} />
            {/await}
        </div>
    </section>
</div>

<style lang="scss">
.page {
    padding: 1rem;
    display: flex;
    flex-direction: row;
    gap: 1rem;

    container: page / inline-size;
}
@container page (width < 800px) {
    .page {
        flex-direction: column;
    }
}

section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .content {
        display: flex;
        flex-direction: column;
        
        background: var(--bg-primary);
        border-radius: 4px;
        padding: 0.5rem 0.75rem;

        gap: 0.5rem;
    }
}
h2 {
    margin: 0 0.5rem;
    font-size: var(--font-medium);
}
</style>