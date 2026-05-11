<script lang="ts">
    import "../app.scss";
    import { page } from "$app/state";
    import { metadata } from "$lib/metadata";

    const { data, children } = $props();
    const config = $derived(data.config ?? {});
    
    $effect(() => {
        if(page.error) $metadata.title = page.error.message;
    });
</script>

<svelte:head>
<title>{$metadata.title} | {config.site?.name}</title>
</svelte:head>

<header class="container">
    <!-- ... -->
</header>
<main class="container">
    {@render children()}
</main>
<footer class="container">
    <!-- ... -->
</footer>

<style lang="scss">
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
main {
    flex-grow: 1;
}
</style>
