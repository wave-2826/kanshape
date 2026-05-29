<script lang="ts">
    import { link } from "$lib/actions";
    import { Settings } from "lucide-svelte";
    import { getProjectContext } from "./context";

    const project = $derived(getProjectContext().project);
</script>

{#if $project}
    <p>wip page!</p>
    <p>Project {$project.title}</p>

    <button use:link={`/projects/${$project.id}/settings`}>
        <Settings />
        Settings
    </button>
{/if}