<!-- global navigation handler -->

<script lang="ts">
    import { beforeNavigate } from "$app/navigation";
    import { nav, shouldHandleNav } from "$lib/navigation";
    import type { Snippet } from "svelte";

    const {
        children
    }: {
        children: Snippet
    } = $props();

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
</script>

{@render children()}