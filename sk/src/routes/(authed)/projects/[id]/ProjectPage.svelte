<script lang="ts">
    import SiteLinks from "$lib/components/projects/SiteLinks.svelte";
    import type { ProjectLinkedSite } from "$lib/data/project";
    import type { ProjectsRecord, SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import type { Snippet } from "svelte";
    import { getLayoutParams } from "../../+layout.svelte";
    import OnshapeLinks from "$lib/components/projects/OnshapeLinks.svelte";

    const {
        children,
        navItems,
        onshapeLinks,
        project,
        subtitle,
        linkedSites
    }: {
        children: Snippet,
        navItems?: Snippet,
        onshapeLinks?: ProjectsRecord | SubprojectsRecord,
        project: ProjectsRecord,
        subtitle?: string,
        linkedSites: ProjectLinkedSite[]
    } = $props();
</script>


<div class="page">
    <svelte:boundary>
        {#snippet failed(error)}
            {@debug error}
            <p>Failed to load page.</p>
            <span class="error">{(error as any)["message"]}</span>
        {/snippet}

        <header>
            <h1>
                <span style={`color: ${project.color ? project.color : 'inherit'};`}>{project.title}</span>
                {#if subtitle}
                    <span class="separator">/</span>
                    <span>{subtitle}</span>
                {/if}
            </h1>
            {#if onshapeLinks && !getLayoutParams().onOnshape && !getLayoutParams().isMobile}
                <OnshapeLinks linkedTo={onshapeLinks} />
            {/if}
            <SiteLinks links={linkedSites} />

            <div style="flex: 1"></div>

            {@render navItems?.()}
        </header>
    
        {@render children()}
    </svelte:boundary>
</div>

<style lang="scss">
.page {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
}

header {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0.5rem;
    gap: 0.5rem;

    white-space: nowrap;
    overflow-x: auto;
}
h1 {
    margin: 0 0.5rem;

    .separator {
        color: var(--text-secondary);
    }
}
</style>