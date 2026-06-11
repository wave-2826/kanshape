<script lang="ts">
    import LeftPaneChooser from "$lib/components/LeftPaneChooser.svelte";
    import { getTemplateSections, type ProjectLinkedSite } from "$lib/data/project";
    import LinkedSiteDetails from "./LinkedSiteDetails.svelte";
    import OnshapeLinks from "./OnshapeLinks.svelte";
    import BoardSettings, { type BoardCreationData } from "./BoardSettings.svelte";
    import { type Create, type ProjectsResponse } from "$lib/pocketbase/generated-types";
    import SubprojectSettings from "./SubprojectSettings.svelte";

    let {
        color = $bindable(),
        name = $bindable(),
        description = $bindable(),
        boards = $bindable(),
        subprojects = $bindable(),
        linkedSites = $bindable(),
        editedProject = null
    }: {
        color?: string;
        name: string;
        description: string;
        boards: BoardCreationData[];
        subprojects: Create<"subprojects">[];
        linkedSites: ProjectLinkedSite[];
        editedProject?: ProjectsResponse | null;
    } = $props();

    const colorSelected = $derived(color !== undefined && color.trim() !== "");
</script>

<h2>Project details</h2>
<input type="text" placeholder="Project name" bind:value={name} />
<textarea placeholder="Project description (optional)" bind:value={description}></textarea>
<div class="option">
    <label for="color">Project color</label>
    <button onclick={() => color = ""} class:selected={!colorSelected}>None</button>
    <input
        type="color"
        id="color"
        value={color ?? "#ffffff"}
        onchange={(e) => color = e.currentTarget.value}
        class:selected={colorSelected}
    />
</div>

<h2>Linked pages</h2>
{#if editedProject}
    <p>Linked Onshape documents</p>
    <div class="linked-sites">
        <!-- Technically, this doesn't have the same saving behavior as the rest of the settings, but... whatever -->
        <OnshapeLinks linkedTo={editedProject} fullPreview />
    </div>
{/if}
<p>Linked sites</p>
<LinkedSiteDetails bind:linkedSites />

<h2>Boards</h2>
<LeftPaneChooser
    options={boards.map(b => ({ name: b.title ?? "", tooltip: b.description }))}
    oncreate={() => boards.push({
        title: `Board ${boards.length + 1}`,
        type: "blank",
        description: "",
        sections: getTemplateSections(),
        part_id_prefix: new Date().getFullYear().toString(),
    })}
    ondelete={(option) => boards.splice(option, 1)}
    ordered
    onreorder={(from, to) => {
        const selArr = boards.map((_, i) => i);
        const selItem = selArr.splice(from, 1)[0];
        selArr.splice(to, 0, selItem);
        boards = selArr.map(i => boards[i]);
    }}
>
    {#snippet pane(selected)}
        {#if boards[selected]}
            <BoardSettings bind:board={boards[selected]} panelBackgrounds="var(--bg-site)" />
        {/if}
    {/snippet}
</LeftPaneChooser>

<h2>Subprojects</h2>
<LeftPaneChooser
    options={subprojects.map(sp => ({ name: sp.name ?? "", tooltip: sp.description }))}
    oncreate={() => subprojects.push({
        name: `Subproject ${subprojects.length + 1}`,
        part_id_offset: (subprojects.length + 1) * 1000
    })}
    ondelete={(option) => subprojects.splice(option, 1)}
>
    {#snippet pane(selected)}
        {#if subprojects[selected]}
            <SubprojectSettings
                bind:subproject={subprojects[selected]}
                panelBackgrounds="var(--bg-site)"
                editing={editedProject !== null}
                sectionPartIDPrefixes={boards
                    .filter(b => b.type === "parts")
                    .map(b => b.part_id_prefix)
                    .filter((v): v is string => !!v) ?? []}
            />
        {/if}
    {/snippet}
</LeftPaneChooser>

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "settings.scss";
</style>