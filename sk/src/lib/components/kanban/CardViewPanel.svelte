<script lang="ts">
    import { deleteRecord, save } from "$lib/pocketbase";
    import { Collections, type CardsResponse, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { Save, Trash } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";

    let {
        card = $bindable(),
        sections,
        subprojects,
        onclose
    }: {
        card: CardsResponse | null,
        sections: SectionsRecord[],
        subprojects: SubprojectsRecord[],
        onclose: () => void
    } = $props();

    function saveCard(card: CardsResponse) {
        save(Collections.Cards, card, {
            create: false
        });
    }

    function deleteCard() {
        if(!card) return;
        deleteRecord(Collections.Cards, card.id);
    }

    // TODO: Figure this out without creating a state update loop
    // const debouncedSave = debounce(saveCard, 250);
    // $effect(() => debouncedSave(card));
</script>

{#if card != null}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="backdrop" onclick={(e) => {
        if(e.target === e.currentTarget) onclose();
    }} transition:fade={{ duration: 200 }}>
        <div class="panel" transition:slide={{ duration: 200, axis: "x" }}>
            <input type="text" bind:value={card.title} class="title" placeholder="Card title" />
            <textarea class="description" bind:value={card.description} placeholder="Card description..."></textarea>

            <label for="section">Section</label>
            <select id="section" name="section" bind:value={card.section}>
                {#each sections as section}
                    <option value={section.id} style="color: {section.color ?? "inherit"}">{section.title}</option>
                {/each}
            </select>

            <label for="priority">Priority</label>
            <select id="priority" name="priority" bind:value={card.priority}>
                <option value="low" style="color: lightgray">Low</option>
                <option value="medium" style="color: gold">Medium</option>
                <option value="high" style="color: orange">High</option>
                <option value="critical" style="color: red">Critical</option>
            </select>

            {#if subprojects.length > 0}
                <label for="subproject">Subproject</label>
                <select id="subproject" name="subproject" bind:value={card.subproject}>
                    <option value="">None</option>
                    {#each subprojects as subproject}
                        <option value={subproject.id}>{subproject.name}</option>
                    {/each}
                </select>
            {/if}

            <span class="label">Actions</span>
            <div class="buttons">
                <!-- TODO: Don't have a save button (especially since we also live update reactively outside of the card view) -->
                <button onclick={() => saveCard(card)}><Save />Save</button>
                <button onclick={deleteCard} class="delete"><Trash />Delete</button>
            </div>

            <span class="label">Information</span>
            <table>
                <tbody>
                    <tr>
                        <td class="label">Created by:</td>
                        <td>{card.created_by}</td>
                    </tr>
                    <tr>
                        <td class="label">Created at:</td>
                        <td>{new Date(card.created).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td class="label">Updated at:</td>
                        <td>{new Date(card.updated).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td class="label">Moved sections at:</td>
                        <td>{new Date(card.moved_at).toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
{/if}

<style lang="scss">
.backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(0.5px);
    z-index: 100;
}
.panel {
    position: absolute;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    border-right: none;
    width: max(50%, 400px);
    right: 0;
    top: 0;
    bottom: 0;
    margin: 1rem 0 1rem 1rem;
    border-radius: 4px 0 0 4px;

    padding: 1rem;

    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.title {
    font-size: var(--font-medium);
    padding: 0.5rem 0.75rem;
    font-weight: 500;
}

label, .label {
    margin-top: 0.5rem;
    font-weight: 500;
    color: var(--text-secondary);
}

.buttons {
    display: flex;
    gap: 0.5rem;

    .delete {
        color: var(--error);
    }
}

table {
    font-size: var(--font-tiny);
    border-collapse: collapse;

    td {
        color: var(--text-secondary);
        padding: 0.25rem 0.5rem;
    }
    .label {
        color: var(--text-tertiary);
        width: 150px;
    }
}
</style>