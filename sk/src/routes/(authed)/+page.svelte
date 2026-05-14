<script lang="ts">
    import { metadata } from "$lib/metadata.js";
    
    const { data } = $props();
    $effect(() => {
        // you could set the metadata either here or in +page.ts
        $metadata.title = data.config.site?.name;
    });
</script>

<p>Hi!</p>