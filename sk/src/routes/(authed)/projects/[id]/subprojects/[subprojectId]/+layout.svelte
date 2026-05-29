<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import { getProjectContext, setSubprojectContext } from "../../context";

    const { children }: { children: Snippet; } = $props();

    const subprojectId = $derived(page.params.subprojectId);
    
    const project = $derived(getProjectContext().project);
    const subproject = $derived.by(() => {
        if(!project) return null;
        return $project?.expand.subprojects?.find((sp) => sp.id === subprojectId) ?? null;
    });

    // svelte-ignore state_referenced_locally
    let subprojectContext = $state({ subproject: subproject });
    setSubprojectContext(subprojectContext);
    $effect(() => {
        subprojectContext.subproject = subproject;
    });
</script>

{@render children()}