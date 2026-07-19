<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import { getProjectContext, setSubprojectContext } from "../../context";
    import { nav } from "$lib/navigation";

    const { children }: { children: Snippet; } = $props();

    const subprojectId = $derived(page.params.subprojectId);
    
    const project = $derived(getProjectContext().project);
    const subproject = $derived.by(() => {
        if(!project) return null;
        if(!$project || !$project.expand.subprojects) return null;
        const subproject = $project.expand.subprojects.find((sp) => sp.id === subprojectId);
        if(!subproject) {
            // project is loaded, but subproject doesn't exist
            nav(`/projects/${page.params.id}`);
            return null;
        }
        return subproject;
    });

    // svelte-ignore state_referenced_locally
    let subprojectContext = $state({ subproject: subproject });
    setSubprojectContext(subprojectContext);
    $effect(() => {
        subprojectContext.subproject = subproject;
    });
</script>

{@render children()}