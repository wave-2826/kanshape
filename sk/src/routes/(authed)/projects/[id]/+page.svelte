<script lang="ts">
    import { page } from "$app/state";
    import KanbanBoard from "$lib/components/kanban/KanbanBoard.svelte";
    import { metadata } from "$lib/metadata";
    import { watchOne } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { untrack } from "svelte";

    const id = $derived(page.params.id);

    const project = $derived(id ? await untrack(() => watchOne(Collections.Projects, id, {
        expand: "subprojects,sections"
    }).catch((err) => {
        console.error("Failed to load project:", err);
        return null;
    })) : null);

    $effect(() => {
        $metadata.title = $project ? `${$project.title}` : "Project";
    });
</script>

<div class="page">
    {#if project && $project !== null}
        <svelte:boundary>
            {#snippet failed(error)}
                <p>Failed to load project.</p>
            {/snippet}

            <h1 style={`color: ${$project.color ? $project.color : 'inherit'};`}>{$project.title}</h1>
            <KanbanBoard project={$project} />
        </svelte:boundary>
    {/if}
</div>

<style lang="scss">
h1 {
    margin: 1rem 0 0.5rem 1rem;
}
.page {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
}
</style>