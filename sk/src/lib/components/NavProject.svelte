<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { type ExpandResponse } from "$lib/pocketbase";
    import { grow } from "$lib/transitions";
    import { ChevronDown, ChevronUp, Kanban, Settings, SquareKanban, Tag } from "lucide-svelte";
    import { untrack } from "svelte";
    
    // svelte-ignore non_reactive_update ???
    enum CollapsedState { Collapsed, Expanded, Auto };
    
    const { project }: {
        project: ExpandResponse<"projects", "subprojects,boards">
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

    const subprojects = $derived(project.expand.subprojects ?? []);
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
    <button class="unstyled" onclick={toggleCollapsed} aria-label={collapsed ? "Expand subprojects" : "Collapse subprojects"}>
        {#if collapsed === CollapsedState.Expanded}
            <ChevronUp />
        {:else}
            <ChevronDown />
        {/if}
    </button>
</div>

{#if showOpen}
    <div class="sublist" transition:grow={{ duration: 100 }} style="--color: {project.color ?? 'var(--bg-secondary)'}">
        <!-- Only show the settings button when on that page; it makes the UI cleaner and there are other navigation options -->
        {#if page.route.id === "/(authed)/projects/[id]/settings"}
            <button class="selected"><Settings />Settings</button>
        {/if}
        {#each project.boards as boardId}
            {@const board = project.expand.boards?.find(b => b.id === boardId)}
            {#if board}
                <button
                    onclick={() => { goto(`/projects/${project.id}/boards/${boardId}`); }}
                    class:selected={page.route.id?.startsWith("/(authed)/projects/[id]/boards/[boardId]") && page.params.boardId === boardId}
                >
                    <Kanban />
                    {board.title}
                </button>
            {/if}
        {/each}
        {#each project.subprojects as subprojectId}
            {@const subproject = subprojects.find(sp => sp.id === subprojectId)}
            {#if subproject}
                <button
                    onclick={() => { goto(`/projects/${project.id}/subprojects/${subproject.id}`); }}
                    class:selected={page.route.id?.startsWith("/(authed)/projects/[id]/subprojects/[subprojectId]") && page.params.subprojectId === subproject.id}
                >
                    <Tag />
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
