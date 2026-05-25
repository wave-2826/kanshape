<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { metadata } from "$lib/metadata";
    import { Settings } from "lucide-svelte";
    import type { Snippet } from "svelte";
    import { setProjectContext, watchProject, type ProjectContext } from "./projectContext";

    const {
        children
    }: {
        children: Snippet
    } = $props();

    $effect(() => {
        $metadata.title = $project ? `${$project.title}` : "Project";
    });

    const id = $derived(page.params.id);

    let projectContext = $state<ProjectContext>({ project: null });
    setProjectContext(projectContext);

    const project = $derived(id ? await watchProject(id).catch((err) => {
        console.error("Failed to load project:", err);
        return null;
    }) : null);

    $effect(() => {
        projectContext.project = project;
    });
    
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
                <div class="multi-button">
                    
                </div>
                {#if !onOnshape}
                    <button onclick={() => goto(`/projects/${$project.id}/settings`)}>
                        <Settings />
                        Settings
                    </button>
                {/if}
            </header>
            {@render children()}
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