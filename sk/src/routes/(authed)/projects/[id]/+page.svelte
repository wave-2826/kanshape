<script lang="ts">
    import { getProjectContext } from "./context";

    const project = $derived(getProjectContext().project);
</script>

<p>wip page!</p>
<p>Project {$project?.title}</p>