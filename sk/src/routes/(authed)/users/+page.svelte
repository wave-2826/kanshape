<script lang="ts">
    import { watch } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import GroupsView from "./GroupsView.svelte";
    import UsersView from "./UsersView.svelte";

    const groups = watch(Collections.GroupOverview, {}, 0, 100, {
        pollOnChange: [Collections.Groups, Collections.Users]
    });
    const users = watch(Collections.Users, {
        expand: "groups"
    }, 0, 100);
</script>

<div class="page-container">
    <div class="page">
        <section>
            <h2>Groups</h2>
            <div class="content">
                {#await groups}
                    <p>Loading groups...</p>
                {:then groups}
                    <GroupsView {groups} />
                {/await}
            </div>
        </section>
        <section>
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
</div>

<style lang="scss">
.page-container {
    container: page / inline-size;
    height: 100%;
}
.page {
    height: 100%;
    padding: 1rem;
    display: grid;
    grid-template-columns: 1fr 1.8fr;
    gap: 1rem;

    position: relative;
}

@container page (max-width: 58rem) {
    .page {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
    }
}

section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;

    .content {
        display: flex;
        flex-direction: column;
        min-height: 0;
        
        background: var(--bg-primary);
        border-radius: 4px;
        padding: 0.5rem;

        gap: 0.5rem;
    }
}
h2 {
    margin: 0 0.5rem;
    font-size: var(--font-medium);
}
</style>