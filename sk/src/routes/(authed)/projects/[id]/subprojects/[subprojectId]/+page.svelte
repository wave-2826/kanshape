<script lang="ts">
    import { page } from "$app/state";

    const id = $derived(page.params.id);
    const subprojectId = $derived(page.params.subprojectId);
</script>

<p>Subproject {subprojectId} of project {id}</p>