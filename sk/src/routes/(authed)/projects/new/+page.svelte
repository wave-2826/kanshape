<script lang="ts">
import { goto } from "$app/navigation";
    import LeftPaneChooser from "$lib/components/LeftPaneChooser.svelte";
    import { Plus } from "lucide-svelte";

let name = $state("");
let description = $state("");
let subprojects = $state<{
    name: string;
    description?: string;
}[]>([]);

function createProject() {
    alert("TODO: project creation");
}
</script>

<h1>New project</h1>

<div class="options">
    <h2>Project details</h2>
    <input type="text" placeholder="Project name" bind:value={name} />
    <textarea placeholder="Project description (optional)" bind:value={description}></textarea>

    <h2>Subprojects</h2>
    <LeftPaneChooser
        options={subprojects.map(sp => sp.name)}
        oncreate={() => subprojects.push({ name: `Subproject ${subprojects.length + 1}` })}
        ondelete={(option) => subprojects.splice(option, 1)}
    >
        {#snippet pane(selected)}
            <div class="subproject">
                <input type="text" placeholder="Subproject name" bind:value={subprojects[selected].name} />
                <textarea placeholder="Subproject description (optional)" bind:value={subprojects[selected].description}></textarea>
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
.subproject {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>