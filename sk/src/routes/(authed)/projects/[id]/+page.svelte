<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import KanbanBoard from "$lib/components/kanban/KanbanBoard.svelte";
    import { metadata } from "$lib/metadata";
    import { watchOne } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { Settings } from "lucide-svelte";

    $effect(() => {
        $metadata.title = $project ? `${$project.title}` : "Project";
    });

    const id = $derived(page.params.id);

    const project = $derived(id ? await watchOne(Collections.Projects, id, {
        expand: "subprojects,sections"
    }).catch((err) => {
        console.error("Failed to load project:", err);
        return null;
    }) : null);

    const onOnshape = $derived((page.route.id?.startsWith("/(authed)/(onshape)") || page.url.searchParams.get("onshape") === "true") ?? false);
</script>

<div class="page">
    {#if project && $project !== null}
        <svelte:boundary>
            {#snippet failed(error)}
                <p>Failed to load project.</p>
                <span class="error">{(error as any)["message"]}</span>
            {/snippet}

            <header>
                <h1 style={`color: ${$project.color ? $project.color : 'inherit'};`}>{$project.title}</h1>
                {#if !onOnshape}
                <button onclick={() => goto(`/projects/${$project.id}/settings`)}>
                    <Settings />
                    Settings
                </button>
                {/if}
            </header>
            <KanbanBoard project={$project} />
        </svelte:boundary>
    {/if}
</div>

<style lang="scss">
header {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0.5rem;
}
h1 {
    flex: 1;
    margin-left: 0.5rem;
}
.page {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
}
</style>