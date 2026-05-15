<script lang="ts">
import LeftPaneChooser from "$lib/components/LeftPaneChooser.svelte";
    import ListChooser from "$lib/components/ListChooser.svelte";
import { Plus } from "lucide-svelte";

let name = $state("");
let description = $state("");
let subprojects = $state<{
    name: string;
    description?: string;
    visibleSections: string[];
}[]>([]);

let sections = $state<{
    id: string;
    name: string;
    description?: string
}[]>([
    { id: crypto.randomUUID(), name: "To Design", description: "Items that still need to be designed in CAD" },
    { id: crypto.randomUUID(), name: "Being Designed", description: "Items currently being worked on in CAD" },
    { id: crypto.randomUUID(), name: "To Manufacture", description: "Items ready for manufacturing" },
    { id: crypto.randomUUID(), name: "Completed", description: "Items that have been completed" }
]);

function createProject() {
    alert("TODO: project creation");
}
</script>

<h1>New project</h1>

<div class="options">
    <h2>Project details</h2>
    <input type="text" placeholder="Project name" bind:value={name} />
    <textarea placeholder="Project description (optional)" bind:value={description}></textarea>

    <h2>Sections</h2>
    <LeftPaneChooser
        options={sections.map(s => s.name)}
        oncreate={() => sections.push({ id: crypto.randomUUID(), name: `Section ${sections.length + 1}` })}
        ondelete={(option) => sections.splice(option, 1)}
    >
        {#snippet pane(selected)}
            <div class="section">
                <input type="text" placeholder="Section name" bind:value={sections[selected].name} />
                <textarea placeholder="Section description (optional)" bind:value={sections[selected].description}></textarea>
            </div>
        {/snippet}
    </LeftPaneChooser>

    <h2>Subprojects</h2>
    <LeftPaneChooser
        options={subprojects.map(sp => sp.name)}
        oncreate={() => subprojects.push({ name: `Subproject ${subprojects.length + 1}`, visibleSections: [] })}
        ondelete={(option) => subprojects.splice(option, 1)}
    >
        {#snippet pane(selected)}
            <div class="subproject">
                <input type="text" placeholder="Subproject name" bind:value={subprojects[selected].name} />
                <textarea placeholder="Subproject description (optional)" bind:value={subprojects[selected].description}></textarea>
                <h3>Visible sections</h3>
                <ListChooser
                    options={sections.map(s => ({ text: s.name, tooltip: s.description, id: s.id }))}
                    bind:selected={subprojects[selected].visibleSections}
                />
            </div>
        {/snippet}
    </LeftPaneChooser>
    
    <button onclick={createProject} disabled={!name.trim()}><Plus />Create {name}</button>
</div>

<style lang="scss">
h1 {
    margin-bottom: 2rem;
}
.options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.subproject, .section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>