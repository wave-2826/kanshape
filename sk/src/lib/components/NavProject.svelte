<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { canonicalizeExpand, type ExpandResponse } from "$lib/pocketbase";
    import type { ProjectsResponse } from "$lib/pocketbase/generated-types";
    import { grow } from "$lib/transitions";
    import { ChevronDown, ChevronUp, Kanban, Settings, SquareKanban } from "lucide-svelte";
    import { untrack } from "svelte";
    
    // svelte-ignore non_reactive_update ???
    enum CollapsedState { Collapsed, Expanded, Auto };
    
    const { project }: {
        project: ExpandResponse<ProjectsResponse, "subprojects:subprojects">
    } = $props();

    const selfSelected = $derived(page.route.id === "/(authed)/projects/[id]" && page.params.id === project.id);
    const treeSelected = $derived(page.route.id?.startsWith("/(authed)/projects/[id]") && page.params.id === project.id);
    
    let collapsed = $state<CollapsedState>(CollapsedState.Auto);
    let showOpen = $derived.by(() => {
        if(collapsed === CollapsedState.Collapsed) return false;
        if(collapsed === CollapsedState.Expanded) return true;
        return treeSelected;
    });
    function toggleCollapsed() {
        if(collapsed === CollapsedState.Collapsed) collapsed = CollapsedState.Expanded;
        else collapsed = CollapsedState.Collapsed;
    }
    
    $effect(() => {
        // one-way state relationship, so we don't use derived
        if(treeSelected && untrack(() => collapsed !== CollapsedState.Expanded)) collapsed = CollapsedState.Auto;
    });

    const subprojects = $derived(canonicalizeExpand(project.expand.subprojects));
</script>

<div class="button project-button" class:selected={treeSelected} style="color: {project.color ?? 'var(--bg-secondary)'}" aria-expanded={!collapsed}>
    <button
        onclick={() => {
            if(selfSelected) toggleCollapsed();
            else goto(`/projects/${project.id}`);
        }}
        class="unstyled"
    >
        <SquareKanban />
        {project.title}
    </button>
    {#if subprojects.length > 0}
        <button class="unstyled" onclick={toggleCollapsed} aria-label={collapsed ? "Expand subprojects" : "Collapse subprojects"}>
            {#if collapsed === CollapsedState.Expanded}
                <ChevronUp />
            {:else}
                <ChevronDown />
            {/if}
        </button>
    {/if}
</div>

{#if showOpen && subprojects.length > 0}
    <div class="sublist" transition:grow style="--color: {project.color ?? 'var(--bg-secondary)'}">
        <!-- Only show the settings button when on that page; it makes the UI cleaner and there are other navigation options -->
        {#if page.route.id === "/(authed)/projects/[id]/settings"}
            <button class="selected"><Settings />Settings</button>
        {/if}
        {#each project.subprojects as subprojectId}
            {@const subproject = subprojects.find(sp => sp.id === subprojectId)}
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
        padding: 0.35em 0.5em;
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
    gap: 0;
    margin-left: 1rem;
    padding-left: 0.25rem;
    border-left: 1px solid var(--color);
}
</style>
