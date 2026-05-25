<script lang="ts">
    import { queryOne, save } from "$lib/pocketbase";
    import BlockSelector from "$lib/pocketbase/selector/BlockSelector.svelte";
    import { Collections, type UsersResponse } from "$lib/pocketbase/generated-types";
    import { Info, Trash } from "lucide-svelte";

    const { user, ondelete }: {
        user: UsersResponse,
        ondelete: () => void
    } = $props();

    function queryFullUser() {
        return queryOne(Collections.Users, user.id, {
            expand: "groups"
        });
    }
    type Resolve<T> = T extends Promise<infer U> ? U : T;
    
    let fullUser: Resolve<ReturnType<typeof queryFullUser>> | null = $state(null);
    // Should only run when user.id changes
    $effect(() => {
        (async () => {
            fullUser = await queryFullUser();
        })();
    });

    const dateFormatter = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    });
</script>

<div class="group">
    <div class="content">
        <input type="text" value={user.name} class="group-name" placeholder="Group name"/>

        <dl>
            <div class="field">
                <dt>Username</dt>
                <dd>{user.username}</dd>
            </div>

            <div class="field">
                <dt>Email</dt>
                <dd class:inactive={!user.emailVisibility}>{user.emailVisibility ? user.email : "Hidden"}</dd>
            </div>

            <div class="field">
                <dt>Admin</dt>
                <dd class:active={user.is_admin} class="boolean">{user.is_admin ? "Yes" : "No"}</dd>
            </div>

            <div class="field">
                <dt>Verified <span class="info" title="This doesn't mean much except that they have a valid oauth method or signed in with email and verified"><Info /></span></dt>
                <dd class:active={user.verified} class="boolean">{user.verified ? "Yes" : "No"}</dd>
            </div>

            <div class="field">
                <dt>Created</dt>
                <dd class="inactive">{dateFormatter.format(new Date(user.created))}</dd>
            </div>

            <div class="field">
                <dt>Updated</dt>
                <dd class="inactive">{user.updated ? dateFormatter.format(new Date(user.updated)) : "Never"}</dd>
            </div>
        </dl>

        <h3>Groups ({user.groups.length})</h3>
        <BlockSelector
            values={fullUser?.expand.groups?.map(g => ({ id: g.id, name: g.name ?? "Unnamed group" })) ?? []}
            searchField="name"
            onchange={async (ids) => {
                await save(Collections.Users, {
                    id: user.id,
                    groups: ids
                }, { create: false }).catch(e => console.error("Failed to save user group changes:", e));

                fullUser = await queryFullUser();
            }}
            collection={Collections.Groups}
        />
    </div>

    <hr />

    <footer>
        <button onclick={ondelete} class="delete"><Trash /> Delete User</button>
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

dl {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .field {
        display: flex;
        gap: 0.5rem;

        dt {
            font-weight: bold;
            width: 6rem;
        }
    }
    .field .boolean {
        color: var(--error);
        &.active { color: var(--accent); }
    }
    .field dd.inactive {
        color: var(--text-secondary);
    }

    .info :global(svg) {
        width: 1em;
        height: 1em;
        margin-left: 0.25rem;
        color: var(--text-secondary);
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