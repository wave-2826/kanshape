<script lang="ts">
    import { metadata } from "$lib/metadata";
    import type { Snippet } from "svelte";
    import { setProjectContext, watchProject, type ProjectContext } from "./context";
    import { page } from "$app/state";

    const {
        children
    }: {
        children: Snippet
    } = $props();

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
    
    $effect(() => {
        $metadata.title = $project ? `${$project.title}` : "Project";
    });
</script>

{@render children()}