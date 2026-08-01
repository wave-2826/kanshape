<script>
    import { ChevronDown, Link, Unlink } from "lucide-svelte";
    import PopoverButton from "../PopoverButton.svelte";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { deleteRecord } from "$lib/pocketbase";
    import { getOnshapeContext, LinkedProjectType } from "./onshapeContext.svelte";

    const onshapeCtx = getOnshapeContext();
    const { linkedProject, documentId } = $derived(onshapeCtx);
</script>

{#if linkedProject && linkedProject.type !== LinkedProjectType.Unregistered && documentId}
    <div class="onshape-header">
        <PopoverButton class={$css("linked-project")}>
            <img src="/onshape.png" alt="Onshape" width="16" height="16" />
            
            {#if linkedProject.type === LinkedProjectType.Unlinked}
                <Unlink class={$css("icon")} /> Unlinked
            {:else}
                <Link class={$css("icon")} /> Linked
            {/if}

            <ChevronDown class={$css("icon")} />

            {#snippet content()}
                <div class="popover-content">
                    {#if linkedProject.type === LinkedProjectType.Unlinked}
                        <p>This document is registered in Kanshape but not linked to any project.</p>
                        <p>Link it to a project or subproject to automatically select one when adding cards.</p>
                    {:else}
                        <p>
                            This document, "<span class="name">
                                {linkedProject.title}
                            </span>", is linked to the project <a class="name" href={`/projects/${linkedProject.project}`} target="_blank">
                                {linkedProject.expand.project?.title ?? "Unknown Project"}
                            </a> {#if linkedProject.expand.subproject} and subproject <a class="name" href={`/projects/${linkedProject.project}/subprojects/${linkedProject.expand.subproject?.id}`} target="_blank">
                                {linkedProject.expand.subproject?.name ?? "Unknown Subproject"}
                            </a>{/if}.
                        </p>
                    {/if}
                    <button onclick={() => {
                        deleteRecord(Collections.OnshapeDocuments, documentId);
                    }} title="Allows you to select a new project or subproject to link">
                        <Unlink class={$css("icon")} />{linkedProject.type === LinkedProjectType.Unlinked ? "Relink" : "Unlink"}
                    </button>
                </div>
            {/snippet}
        </PopoverButton>
    </div>
{/if}

<style lang="scss">
.onshape-header {
    display: content;

    img {
        vertical-align: middle;
    }
    .icon {
        width: 1em;
        height: 1em;
        color: var(--text-secondary);
    }
    
    .linked-project {
        font-size: var(--font-small);

        display: flex;
        align-items: center;
        gap: 0.25rem;

        --bg-color: var(--bg-secondary);
        padding: 0.25em 0.5em;
        border-radius: 4px;
    }
}

.name {
    color: var(--accent);
}
.popover-content {
    font-size: var(--font-small);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 200px;
}
</style>