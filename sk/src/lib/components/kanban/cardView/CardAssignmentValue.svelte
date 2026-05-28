<script lang="ts">
    import { dateOnly, tomorrowDate } from "$lib/datetime";
    import { client } from "$lib/pocketbase";
    import type { AnyoneOnAssignmentData, CardAssignmentData } from "../../../data/cards";
    import InlineSelector from "$lib/pocketbase/selector/InlineSelector.svelte";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { authModel } from "$lib/pocketbase/auth";
    import { Flag } from "lucide-svelte";

    let {
        assignmentData = $bindable(),
        nameCache
    }: {
        assignmentData: CardAssignmentData;
        nameCache: string[]
    } = $props();

    function canClaimGroupAssignment(data: CardAssignmentData | null) {
        if(!$authModel) return false;
        return data?.type === "groups" && $authModel.groups.some((groupId) => data.ids.includes(groupId));
    }
</script>

<!-- TODO: Card only saves once when changing this -->

<div class="prop-value">
    {#if assignmentData}
        <div class="assignment">
            <select bind:value={
                () => assignmentData!.type, 
                (value) => {
                    if(value === "users" || value === "groups") {
                        assignmentData = { type: value, ids: [] };
                    } else if(value === "anyone_on") {
                        assignmentData = { type: "anyone_on", on_date: dateOnly(tomorrowDate()) };
                    } else if(value === "looking_for_assignment") {
                        assignmentData = { type: "looking_for_assignment" };
                    }
                }
            }>
                <option value="users">Users</option>
                <option value="groups">Groups</option>
                <option value="anyone_on">Anyone on...</option>
                <option value="looking_for_assignment">Looking for Assignment</option>
            </select>

            {#if assignmentData.type === "users"}
                <InlineSelector
                    collection={Collections.Users}
                    searchField="name"
                    values={assignmentData.ids.map((id, i) => ({ id, name: nameCache[i] ?? "Unknown User" }))}
                    onchange={(ids) => assignmentData = { type: "users", ids }}
                    itemName="users"
                />
            {:else if assignmentData.type === "groups"}
                <InlineSelector
                    collection={Collections.Groups}
                    searchField="name"
                    values={assignmentData.ids.map((id, i) => ({ id, name: nameCache[i] ?? "Unknown Group" }))}
                    onchange={(ids) => assignmentData = { type: "groups", ids }}
                    itemName="groups"
                />
                {#if canClaimGroupAssignment(assignmentData)}
                    <button
                        onclick={() => {
                            if($authModel) assignmentData = { type: "users", ids: [$authModel.id] };
                        }}
                        class="claim"
                        title="This task is assigned to one or more of the groups you are in. Click to claim the task for yourself."
                    ><Flag /> Claim</button>
                {/if}
            {:else if assignmentData.type === "anyone_on"}
                <input type="date" bind:value={
                    () => (assignmentData! as AnyoneOnAssignmentData).on_date.slice(0, 10), 
                    (value) => assignmentData = { type: "anyone_on", on_date: dateOnly(new Date(value)) }
                } />
            {:else if assignmentData.type === "looking_for_assignment"}
                <button onclick={() => {
                    if(client.authStore.record) assignmentData = { type: "users", ids: [client.authStore.record?.id] };
                }}>Assign yourself</button>
            {/if}
        </div>
    {:else}
        <button class="add" onclick={() => assignmentData = { type: "users", ids: [] }}>+ Assign</button>
    {/if}
</div>

<!-- svelte-ignore css_unused_selector - shared stylesheet -->
<style lang="scss">
@use "props.scss";

.assignment {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    justify-content: flex-start;
    gap: 0.5rem;

    select {
        flex: 1;
        min-width: 5rem;
    }
    input {
        flex: 1;
    }
}

.claim {
    color: var(--success);
}
</style>