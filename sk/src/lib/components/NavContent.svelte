<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { watch } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { FolderKanban, Medal, Plus, Settings, Users } from "lucide-svelte";
    import NavProject from "./NavProject.svelte";

    const projects = await watch(Collections.Projects, {
        expand: "subprojects"
    }, 1, 500).catch((err) => {
        console.error("Failed to load projects:", err);
        return null;
    });
</script>

<button onclick={() => { goto("/"); }} class:selected={page.route.id === "/(authed)"}>
    <FolderKanban />
    Overview
</button>
<button onclick={() => { goto("/leaderboard"); }} class:selected={page.route.id === "/(authed)/leaderboard"}>
    <Medal />
    Leaderboard
</button>

<h2>Projects</h2>

{#if projects !== null && $projects !== null}
    <div class="projects">
        {#each $projects.items as project}
            <NavProject {project} />
        {/each}
        {#if $projects.totalItems === 0}
            <p>No projects found.</p>
        {/if}
    </div>
    <button onclick={() => { goto("/projects/new"); }} class:selected={page.route.id === "/(authed)/projects/new"}>
        <Plus />
        New project
    </button>
{:else}
    <p>Failed to load projects.</p>
{/if}

<div style="flex-grow: 1;"></div>

<!-- TODO (priority medium): users page to see all application users, remove them (for admins), see assigned tasks, etc -->
<button onclick={() => { goto("/users"); }} class:selected={page.route.id === "/(authed)/users"}>
    <Users />
    Users and Groups
</button>
<button onclick={() => { goto("/settings"); }} class:selected={page.route.id === "/(authed)/settings"}>
    <Settings />
    Application Settings
</button>

<style lang="scss">
button {
    --bg-color: transparent;
}
button.selected {
    --bg-color: var(--bg-secondary);
}
h2 {
    margin-top: 1rem;
}
p { 
    font-size: var(--font-small);
    color: var(--text-secondary);
    margin: 0.5rem 0 1rem 0.5rem;
}

.projects {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex-shrink: 1;
}
</style>