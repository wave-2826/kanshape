<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { grow } from "$lib/transitions";
    import { ChevronDown, ChevronUp, Kanban, SquareKanban } from "lucide-svelte";

    const { project } = $props();

    const selected = $derived(page.route.id?.startsWith("/(authed)/projects/[id]") && page.params.id === project.id);
    let collapsed = $state(true);
    $effect(() => {
        // one-way state relationship, so we don't use derived
        if(selected) collapsed = false;
    });
</script>

<div class="button project-button" class:selected={selected} style="color: {project.color ?? 'var(--bg-secondary)'}" aria-expanded={!collapsed}>
    <button
        onclick={() => {
            if(selected) collapsed = !collapsed;
            else goto(`/projects/${project.id}`);
        }}
        class="unstyled"
    >
        <SquareKanban />
        {project.title}
    </button>
    <button class="unstyled" onclick={() => collapsed = !collapsed} aria-label={collapsed ? "Expand subprojects" : "Collapse subprojects"}>
        {#if collapsed}
            <ChevronDown />
        {:else}
            <ChevronUp />
        {/if}
    </button>
</div>

{#if !collapsed}
    <div class="sublist" transition:grow>
        {#each project.subprojects as subprojectId}
            {@const subprojects = project.expand.subprojects}
            {@const subproject = subprojects instanceof Array ? subprojects.find(sp => sp.id === subprojectId) : null}
            {#if subproject}
                <button
                    onclick={() => { goto(`/projects/${project.id}/subprojects/${subproject.id}`); }}
                    class:selected={page.route.id === "/(authed)/projects/[id]/subprojects/[subprojectId]" && page.params.subprojectId === subproject.id}
                >
                    <Kanban />
                    {subproject.name}
                </button>
            {/if}
        {/each}
    </div>
{/if}

<style lang="scss">
.project-button {
    padding: 0;

    gap: 0;

    :first-child {
        flex-grow: 1;
    }
    button {
        padding: 0.5rem;
    }
}
button, .button {
    --bg-color: transparent;
}
button.selected, .button.selected {
    --bg-color: var(--bg-secondary);
}

.sublist {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-left: 0.5rem;
    padding-left: 0.5rem;
    border-left: 2px solid var(--border);

    > button {
        padding: 0.25rem 0.5rem;
    }
}
</style>
