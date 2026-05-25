<script lang="ts">
    import LeftPaneChooser from "$lib/components/LeftPaneChooser.svelte";
    import { getConfig } from "$lib/config";
    import type { ProjectLinkedSite } from "$lib/project";
    import { X } from "lucide-svelte";

    const config = getConfig();

    let {
        linkedSites = $bindable(),
        background
    }: {
        linkedSites?: ProjectLinkedSite[];
        background?: string;
    } = $props();
</script>

<LeftPaneChooser
    options={linkedSites?.map(s => ({ name: s.name ?? "", tooltip: s.url })) ?? []}
    oncreate={() => {
        if(!linkedSites) linkedSites = [];
        linkedSites.push({ name: `New site`, url: "" })
    }}
    ondelete={(option) => linkedSites?.splice(option, 1)}
    compact
    {background}
>
    {#snippet pane(selected)}
        {#if linkedSites}
            <div class="linked-site">
                <input type="text" placeholder="Site name" bind:value={linkedSites[selected].name} />
                <label for="site-url">Site URL</label>
                <input id="site-url" type="text" placeholder="Site URL" bind:value={linkedSites[selected].url} />
                <label for="site-icon">Custom icon</label>
                <div class="custom-icon">
                    <button
                        onclick={() => linkedSites![selected].icon = "site"}
                        class:selected={linkedSites[selected].icon === "site"}
                    >{config.site.name} favicon</button>
                    <input id="site-icon" type="text" placeholder="Icon URL (optional)" bind:value={
                        () => linkedSites![selected].icon === "site" ? "" : linkedSites![selected].icon,
                        (value) => linkedSites![selected].icon = value
                    } />
                    <button
                        onclick={() => linkedSites![selected].icon = undefined}
                        class:selected={!linkedSites[selected].icon}
                    ><X /></button>
                </div>
            </div>
        {/if}
    {/snippet}
</LeftPaneChooser>

<style lang="scss">
.linked-site {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    input {
        padding: 0.25rem 0.5rem;
    }

    label {
        margin: 0.25rem 0 0 0.25rem;
        font-size: var(--font-small);
    }
    .custom-icon {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
        input { flex: 1; }
    }
}
</style>