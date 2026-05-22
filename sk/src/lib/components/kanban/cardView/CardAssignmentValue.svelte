<script lang="ts">
    import type { CardAssignmentData } from "../cards";

    let {
        assignment_data = $bindable()
    }: {
        assignment_data: CardAssignmentData;
    } = $props();
</script>

<!-- TODO: Card only saves once when changing this -->

<div class="prop-value">
    {#if assignment_data}
        <div class="assignment">
            <select bind:value={assignment_data.type}>
                <option value="users">Users</option>
                <option value="groups">Groups</option>
                <option value="anyone">Anyone on...</option>
                <option value="looking_for_assignment">Looking for Assignment</option>
            </select>

            {#if assignment_data.type === "users"}
                todo: user selector
            {/if}
        </div>
    {:else}
        <button class="add" onclick={() => assignment_data = { type: "users", ids: [] }}>+ Assign</button>
    {/if}
</div>

<!-- svelte-ignore css_unused_selector - shared stylesheet -->
<style lang="scss">
@use "props.scss";

.assignment {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
}
</style>