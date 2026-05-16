<script lang="ts">
    import LeftPaneChooser from "$lib/components/LeftPaneChooser.svelte";
    import { metadata } from "$lib/metadata";
    import { createPartIDString } from "$lib/parts";
    import { batch, save, saveBatch } from "$lib/pocketbase";
    import { Collections } from "$lib/pocketbase/generated-types";
    import { Plus } from "lucide-svelte";

    $effect(() => {
        $metadata.title = "New project";
    });

    let name = $state("");
    let description = $state("");
    let color = $state<string | null>(null);
    let partIdPrefix = $state(new Date().getFullYear().toString());
    let subprojects = $state<{
        name: string;
        description?: string;
        partIdOffset: number;
    }[]>([]);

    let sections = $state<{
        name: string;
        description?: string;
        color: string | null;
        isCompleted: boolean;
    }[]>([
        { name: "To Design", description: "Items that still need to be designed in CAD", color: null, isCompleted: false },
        { name: "Being Designed", description: "Items currently being worked on in CAD", color: "#fdcb6e", isCompleted: false },
        { name: "To Manufacture", description: "Items ready for manufacturing", color: "#00b894", isCompleted: false },
        { name: "Completed", description: "Items that have been completed", color: "#0984e3", isCompleted: true }
    ]);

    async function createProject() {
        const result = await batch(async (batch) => {
            for(const section of sections) {
                saveBatch(Collections.Sections, {
                    title: section.name,
                    description: section.description,
                    color: section.color ?? undefined,
                    is_completed: section.isCompleted
                }, batch);
            }
            
            for(const subproject of subprojects) {
                saveBatch(Collections.Subprojects, {
                    name: subproject.name,
                    description: subproject.description,
                    part_id_offset: subproject.partIdOffset
                }, batch);
            }
        });

        let sectionIds = result.filter(r => r.body.collectionName === Collections.Sections).map(r => r.body.id);
        let subprojectIds = result.filter(r => r.body.collectionName === Collections.Subprojects).map(r => r.body.id);

        // Sadly, PB doesn't support transactions, so we have to do this across multiple requests.
        const projectRecord = await save(Collections.Projects, {
            title: name,
            description,
            part_id_prefix: partIdPrefix,
            current_part_id: 1,
            color: color ?? undefined,
            sections: sectionIds,
            subprojects: subprojectIds
        });

        // Redirect to the new project page
        window.location.href = `/projects/${projectRecord.id}`;
    }
</script>

<h1>New project</h1>

<div class="options">
    <h2>Project details</h2>
    <input type="text" placeholder="Project name" bind:value={name} />
    <textarea placeholder="Project description (optional)" bind:value={description}></textarea>
    <div class="option">
        <label for="color">Project color</label>
        <button onclick={color = null} class:selected={color === null}>None</button>
        <input
            type="color"
            id="color"
            value={color ?? "#ffffff"}
            onchange={(e) => color = e.currentTarget.value}
            class:selected={color !== null}
        />
    </div>
    <div class="option">
        <label for="partIdPrefix">Part ID prefix</label>
        <input type="text" placeholder="Part ID prefix" id="partIdPrefix" bind:value={partIdPrefix} maxlength="20" />
        <span class="part-id-preview">Part IDs will look like {createPartIDString(partIdPrefix, 0, 1, 1)}</span>
    </div>

    <h2>Sections</h2>
    <LeftPaneChooser
        options={sections.map(s => ({ name: s.name, tooltip: s.description, color: s.color ?? undefined }))}
        oncreate={() => sections.push({ name: `Section ${sections.length + 1}`, color: null, isCompleted: false })}
        ondelete={(option) => sections.splice(option, 1)}
    >
        {#snippet pane(selected)}
            <div class="section">
                <input type="text" placeholder="Section name" bind:value={sections[selected].name} />
                <textarea placeholder="Section description (optional)" bind:value={sections[selected].description}></textarea>
                <div class="option">
                    <label for="color">Section color</label>
                    <button onclick={sections[selected].color = null} class:selected={sections[selected].color === null}>None</button>
                    <input
                        type="color"
                        id="color"
                        value={sections[selected].color ?? "#ffffff"}
                        onchange={(e) => sections[selected].color = e.currentTarget.value}
                        class:selected={sections[selected].color !== null}
                    />
                </div>
                <div class="option" title="Used only for leaderboards and display for now">
                    <label for="isCompleted">Is Completed</label>
                    <input
                        type="checkbox"
                        id="isCompleted"
                        checked={sections[selected].isCompleted}
                        onchange={(e) => sections[selected].isCompleted = e.currentTarget.checked}
                    />
                </div>
            </div>
        {/snippet}
    </LeftPaneChooser>

    <h2>Subprojects</h2>
    <LeftPaneChooser
        options={subprojects.map(sp => ({ name: sp.name, tooltip: sp.description }))}
        oncreate={() => subprojects.push({ name: `Subproject ${subprojects.length + 1}`, partIdOffset: (subprojects.length + 1) * 1000 })}
        ondelete={(option) => subprojects.splice(option, 1)}
    >
        {#snippet pane(selected)}
            {@const subproject = subprojects[selected]}
            <div class="subproject">
                <input type="text" placeholder="Subproject name" bind:value={subproject.name} />
                <textarea placeholder="Subproject description (optional)" bind:value={subproject.description}></textarea>
                <div class="option">
                    <input type="number" placeholder="Part ID offset" bind:value={subproject.partIdOffset} min="0" />
                    <span class="part-id-preview">Part IDs will look like {createPartIDString(partIdPrefix, subproject.partIdOffset || 0, 1, 1)}</span>
                </div>
            </div>
        {/snippet}
    </LeftPaneChooser>
    
    <button onclick={createProject} disabled={name.trim().length === 0 || partIdPrefix.trim().length === 0}><Plus />Create {name}</button>
</div>

<style lang="scss">
h1 {
    margin-bottom: 2rem;
}

.options {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .option {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-left: 0.5rem;
    }
}
.subproject, .section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.part-id-preview {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-left: 1rem;
}
</style>