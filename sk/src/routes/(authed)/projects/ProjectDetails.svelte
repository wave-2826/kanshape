<script lang="ts" module>
    import { BoardsTypeOptions, ProjectsTypeOptions, type Create, type ProjectsResponse, type SectionsResponse } from "$lib/pocketbase/generated-types";

    export type BoardCreationData = Omit<Create<"boards">, "sections"> & {
        sections: Create<"sections">[]
    };
</script>

<script lang="ts">
    import LeftPaneChooser from "$lib/components/LeftPaneChooser.svelte";
    import { createPartIDString } from "$lib/parts";
    import { boardTypes, getTemplateSections, projectTypes, type ProjectLinkedSite } from "$lib/data/project";
    import LinkedSiteDetails from "./LinkedSiteDetails.svelte";
    import OnshapeLinks from "./[id]/boards/[boardId]/OnshapeLinks.svelte";

    let {
        color = $bindable(),
        name = $bindable(),
        description = $bindable(),
        partIdPrefix = $bindable(),
        type = $bindable(),
        boards = $bindable(),
        subprojects = $bindable(),
        linkedSites = $bindable(),
        editedProject = null
    }: {
        color?: string;
        name: string;
        description: string;
        partIdPrefix: string;
        type: ProjectsTypeOptions;
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

<h2>Project type</h2>
<div class="type-selector">
    {#each (Object.keys(ProjectsTypeOptions) as ProjectsTypeOptions[]) as option}
        {@const optionDetails = projectTypes[option]}
        <button class:selected={type === option} onclick={() => type = option}>
            {optionDetails.name}
            <span class="description">{optionDetails.description}</span>
        </button>
    {/each}
</div>
{#if type === "manufacturing"}
    <div class="option">
        <label for="partIdPrefix">Part ID prefix</label>
        <input type="text" placeholder="Part ID prefix" id="partIdPrefix" bind:value={partIdPrefix} maxlength="20" />
        <span class="part-id-preview">Part IDs will look like {createPartIDString(partIdPrefix, 0, 1, 1)}</span>
    </div>
{/if}

<h2>Linked pages</h2>
{#if editedProject && type === "manufacturing"}
    <p>Linked Onshape documents</p>
    <div class="linked-sites">
        <!-- Technically, this doesn't have the same saving behavior as the rest of the settings, but... whatever -->
        <OnshapeLinks project={editedProject} fullPreview />
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
        sections: getTemplateSections()
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
        {@const board = boards[selected]}
        {#if board}
            <div class="board">
                <input type="text" placeholder="Board name" bind:value={board.title} />
                <textarea placeholder="Board description (optional)" bind:value={board.description}></textarea>

                <p>Board type</p>
                <div class="type-selector">
                    {#each (Object.keys(BoardsTypeOptions) as BoardsTypeOptions[]) as option}
                        {@const optionDetails = boardTypes[option]}
                        <button class:selected={board.type === option} onclick={() => board.type = option}>
                            {optionDetails.name}
                            <span class="description">{optionDetails.description}</span>
                        </button>
                    {/each}
                </div>

                <p>Sections</p>
                <LeftPaneChooser
                    options={board.sections?.map(s => ({ name: s.title ?? "", tooltip: s.description })) ?? []}
                    oncreate={() => {
                        if(!board.sections) board.sections = [];
                        board.sections.push({ title: `Section ${board.sections.length + 1}`, description: "", color: undefined, is_completed: false });
                    }}
                    ondelete={(option) => board.sections?.splice(option, 1)}
                    ordered
                    onreorder={(from, to) => {
                        if(!board.sections) return;
                        const selArr = board.sections.map((_, i) => i);
                        const selItem = selArr.splice(from, 1)[0];
                        selArr.splice(to, 0, selItem);
                        board.sections = selArr.map(i => board.sections![i]);
                    }}
                    background="var(--bg-site)"
                >
                    {#snippet pane(selected)}
                        {@const section = board.sections?.[selected]}
                        {#if section}
                            {@const hasColor = section.color !== undefined && section.color.trim() !== ""}
                            <div class="section">
                                <input type="text" placeholder="Section name" bind:value={section.title} />
                                <textarea placeholder="Section description (optional)" bind:value={section.description}></textarea>

                                <div class="option">
                                    <label for="sectionColor">Section color</label>
                                    <input
                                        type="color"
                                        id="sectionColor"
                                        value={section.color ?? "#ffffff"}
                                        onchange={(e) => section.color = e.currentTarget.value}
                                        class:selected={hasColor}
                                    />
                                    <button onclick={() => section.color = ""} class:selected={!hasColor}>None</button>
                                </div>
                                <div class="option">
                                    <label for="isCompleted">Is completed?</label>
                                    <input
                                        type="checkbox"
                                        id="isCompleted"
                                        checked={section.is_completed}
                                        onchange={(e) => section.is_completed = e.currentTarget.checked}
                                    />
                                </div>
                            </div>
                        {/if}
                    {/snippet}
                </LeftPaneChooser>

                <p>Linked sites</p>
                <!-- TODO: this UI is stupid -->
                <LinkedSiteDetails bind:linkedSites={board.linked_sites as ProjectLinkedSite[]} background="var(--bg-site)" />
            </div>
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
        {@const subproject = subprojects[selected]}
        <div class="subproject">
            <input type="text" placeholder="Subproject name" bind:value={subproject.name} />
            <textarea placeholder="Subproject description (optional)" bind:value={subproject.description}></textarea>
            {#if type === "manufacturing"}
                <div class="option">
                    <label for="partIdOffset">Part ID offset</label>
                    <input type="number" placeholder="Part ID offset" bind:value={subproject.part_id_offset} min="0" />
                    <span class="part-id-preview">Part IDs will look like {createPartIDString(partIdPrefix, subproject.part_id_offset || 0, 1, 1)}</span>
                </div>
            {/if}

            <p>Linked sites</p>
            <!-- TODO: this UI is stupid -->
            <LinkedSiteDetails bind:linkedSites={subproject.linked_sites as ProjectLinkedSite[]} background="var(--bg-site)" />
        </div>
    {/snippet}
</LeftPaneChooser>

<style lang="scss">
.type-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    button {
        display: block;
        text-align: left;
    }
    .description {
        font-size: var(--font-small);
        color: var(--text-secondary);
        margin-left: 0.75rem;
        white-space: normal;
    }
}
.option {
    display: flex;
    align-items: center;
    gap: 1rem;
}
.subproject, .board, .section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.subproject label, .subproject p {
    font-size: var(--font-small);
    margin-left: 0.5rem;
}

.part-id-preview {
    font-size: var(--font-small);
    color: var(--text-secondary);
    margin-left: 1rem;
}

.linked-sites {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-left: 0.5rem;
}
</style>