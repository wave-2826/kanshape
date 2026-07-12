<script lang="ts">
    import { page } from "$app/state";
    import { watch } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { AlarmClock, FolderKanban, Medal, Plus, Settings, Users } from "lucide-svelte";
    import { link } from "$lib/actions";
    import NavProject from "./NavProject.svelte";
    import { authModel } from "$lib/pocketbase/auth";
    import { fly } from "svelte/transition";

    const projects = await watch(Collections.Projects, {
        expand: "subprojects,boards"
    }, 1, 500).catch((err) => {
        console.error("Failed to load projects:", err);
        return null;
    });
</script>

<button use:link={"/"} class:selected={page.route.id === "/(authed)"}>
    <FolderKanban />
    Overview
</button>
<button use:link={"/leaderboard"} class:selected={page.route.id === "/(authed)/leaderboard"}>
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
    <button use:link={"/projects/new"} class:selected={page.route.id === "/(authed)/projects/new"}>
        <Plus />
        New project
    </button>
{:else}
    <p>Failed to load projects.</p>
{/if}

<div style="flex-grow: 1;"></div>

{#if page.route.id === "/(authed)/log"}
    <button use:link={"/log"} class:selected={page.route.id === "/(authed)/log"} transition:fly={{ y: 5, duration: 100 }}>
        <AlarmClock />
        Activity Log
    </button>
{/if}
<button use:link={"/users"} class:selected={page.route.id === "/(authed)/users"}>
    <Users />
    Users and Groups
</button>
{#if $authModel?.is_admin}
    <button use:link={"/settings"} class:selected={page.route.id === "/(authed)/settings"}>
        <Settings />
        Application Settings
    </button>
{/if}

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