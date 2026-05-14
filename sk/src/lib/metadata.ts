// Store for metadata
import { writable } from "svelte/store";

/** Writable store for per-page metadata */
export const metadata = writable({
    title: "Home"
});
