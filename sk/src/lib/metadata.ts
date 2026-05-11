// Store for metadata
import { writable } from "svelte/store";

// Create a writable store for metadata
export const metadata = writable({
    title: "Kanshape",
    description: "A Kanban board integrated tightly with Onshape for tracking manufacturing.",
});
