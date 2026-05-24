<script lang="ts">
    import LeftPaneChooser from "$lib/components/LeftPaneChooser.svelte";
    import { createPartIDString } from "$lib/parts";
    import { ProjectsTypeOptions, type Create } from "$lib/pocketbase/generated-types";

    let {
        color = $bindable(),
        name = $bindable(),
        description = $bindable(),
        partIdPrefix = $bindable(),
        type = $bindable(),
        sections = $bindable(),
        subprojects = $bindable()
    }: {
        color?: string;
        name: string;
        description: string;
        partIdPrefix: string;
        type: ProjectsTypeOptions;
        sections: Create<"sections">[];
        subprojects: Create<"subprojects">[];
    } = $props();

    const projectTypes: {
        [key in ProjectsTypeOptions]: {
            name: string;
            description: string;
        }
    } = {
        "blank": {
            name: "Blank",
            description: "Miscellaneous project type with no special features"
        },
        "manufacturing": {
            name: "Manufacturing",
            description: "Allows configuring part IDs"
        }
    };

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
{#each (Object.keys(ProjectsTypeOptions) as ProjectsTypeOptions[]) as option}
    {@const optionDetails = projectTypes[option]}
    <button class:selected={type === option} onclick={() => type = option}>
        {optionDetails.name}
        <span class="description">{optionDetails.description}</span>
    </button>
{/each}
{#if type === "manufacturing"}
    <div class="option">
        <label for="partIdPrefix">Part ID prefix</label>
        <input type="text" placeholder="Part ID prefix" id="partIdPrefix" bind:value={partIdPrefix} maxlength="20" />
        <span class="part-id-preview">Part IDs will look like {createPartIDString(partIdPrefix, 0, 1, 1)}</span>
    </div>
{/if}

<h2>Sections</h2>
<LeftPaneChooser
    options={sections.map(s => ({ name: s.title ?? "", tooltip: s.description, color: s.color ?? undefined }))}
    oncreate={() => sections.push({ title: `Section ${sections.length + 1}`, color: undefined, is_completed: false })}
    ondelete={(option) => sections.splice(option, 1)}
    ordered
    onreorder={(from, to) => {
        const selArr = sections.map((_, i) => i);
        const selItem = selArr.splice(from, 1)[0];
        selArr.splice(to, 0, selItem);
        sections = selArr.map(i => sections[i]);
    }}
>
    {#snippet pane(selected)}
        {@const colorSelected = sections[selected].color !== undefined && sections[selected].color.trim() !== ""}
        <div class="section">
            <input type="text" placeholder="Section name" bind:value={sections[selected].title} />
            <textarea placeholder="Section description (optional)" bind:value={sections[selected].description}></textarea>
            <div class="option">
                <label for="color">Section color</label>
                <button onclick={() => sections[selected].color = ""} class:selected={!colorSelected}>None</button>
                <input
                    type="color"
                    id="color"
                    value={sections[selected].color ?? "#ffffff"}
                    onchange={(e) => sections[selected].color = e.currentTarget.value}
                    class:selected={colorSelected}
                />
            </div>
            <div class="option" title="Used only for leaderboards and display for now">
                <label for="isCompleted">Is Completed</label>
                <input
                    type="checkbox"
                    id="isCompleted"
                    checked={sections[selected].is_completed}
                    onchange={(e) => sections[selected].is_completed = e.currentTarget.checked}
                />
            </div>
        </div>
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
        </div>
    {/snippet}
</LeftPaneChooser>

<style lang="scss">
.description {
    font-size: var(--font-small);
    color: var(--text-secondary);
    margin-left: 0.5rem;
}
.option {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-left: 0.5rem;
}
.subproject, .section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.part-id-preview {
    font-size: var(--font-small);
    color: var(--text-secondary);
    margin-left: 1rem;
}
</style>