import adapter from "@sveltejs/adapter-static";
import preprocess from "svelte-preprocess";
import cssRune from "svelte-css-rune";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [preprocess(), cssRune()],

    compilerOptions: {
        experimental: {
            async: true
        },
    },
    
    kit: {
        alias: {
            $lib: "src/lib",
        },
        adapter: adapter({
            // Prerendering turned off. Turn it on if you know what you're doing.
            prerender: { entries: [] },
            fallback: "index.html", // enable SPA mode
        })
    }
};

export default config;
