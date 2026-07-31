<!-- global navigation handler -->

<script lang="ts">
    import { beforeNavigate } from "$app/navigation";
    import { setConfig } from "$lib/config";
    import { metadata } from "$lib/metadata";
    import { nav, shouldHandleNav } from "$lib/navigation";

    const { data, children } = $props();

    // typically we use nav() in this application manually, but this catches navigation from other
    // sources like anchors.
    beforeNavigate((navCtx) => {
        const { to, willUnload, cancel, type } = navCtx;
        if(type === "popstate") return; // no need to manually handle if it's a browser history change

        if(to && !willUnload && shouldHandleNav()) {
            cancel();
            // sveltekit just... doesn't give us the options here, so the only way to preserve
            // those would be using nav() manually. alas.
            nav(to.url.toString());
        }
    });

    const config = $derived(data.config ?? {});
    // svelte-ignore state_referenced_locally
    setConfig(config);
</script>

<svelte:head>
    <link rel="icon" href="{config.site.faviconUrl}" />
    <title>{$metadata.title} - {config.site.name}</title>
</svelte:head>

{@render children()}