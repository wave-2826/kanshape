<script lang="ts">
    import { client, save } from "$lib/pocketbase";
    import { CardsPriorityOptions, Collections, type CardsResponse, type SectionsRecord } from "$lib/pocketbase/generated-types";
    import Modal from "../Modal.svelte";
    import { priorities } from "./cards";
    import { nextCardPosition } from "./kanban";

    let {
        projectId,
        sections,
        boardCards
    }: {
        projectId: string,
        sections: SectionsRecord[],
        boardCards: CardsResponse[]
    } = $props();

    let title = $state("");
    // svelte-ignore state_referenced_locally
    let sectionId = $state(sections[0]?.id ?? "");
    let description = $state("");
    let priority: CardsPriorityOptions = $state("low");

    let modal: Modal;
    async function create() {
        if(title.length === 0) return;

        await save(Collections.Cards, {
            title,
            project: projectId,
            section: sectionId,
            position: nextCardPosition(boardCards, sectionId),
            moved_at: new Date().toISOString(),
            created_by: client.authStore.record?.id,
            description,
            priority
        }, { create: true }).catch((err) => {
            console.error("Failed to create card:", err);
            return null;
        });

        title = "";
        description = "";
        modal.close();
    }

    export function open(defaultSectionId?: string) {
        if(defaultSectionId) sectionId = defaultSectionId;
        else sectionId = sections[0]?.id ?? "";
        modal.open();
    }

    function focus(node: HTMLElement) {
        node.focus();
    }
</script>

<Modal id="new-card" bind:this={modal}>
    {#snippet children({ close })}
        <h2>New Card</h2>
        
        <form onsubmit={(e) => { e.preventDefault(); create(); }}>
            <label for="title">Title</label>
            <input type="text" id="title" name="title" placeholder="Card title" bind:value={title} use:focus />
            
            <label for="section">Section</label>
            <select id="section" name="section" bind:value={sectionId}>
                {#each sections as section}
                    <option value={section.id} style="color: {section.color ?? "inherit"}">{section.title}</option>
                {/each}
            </select>

            <label for="priority">Priority</label>
            <select id="priority" name="priority" bind:value={priority}>
                {#each Object.entries(priorities) as [key, v]}
                    <option value={key} style="color: {v.color}">{v.label}</option>
                {/each}
            </select>

            <label for="description">Description</label>
            <textarea id="description" name="description" placeholder="Card description" bind:value={description}></textarea>

            <div class="buttons">
                <button onclick={close}>Close</button>
                <button type="submit" disabled={title.length === 0}>Create</button>
            </div>
        </form>
    {/snippet}
</Modal>

<style lang="scss">
h2 {
    margin-top: 0;
}
form {
    display: flex;
    flex-direction: column;
    min-width: 300px;
}
label {
    margin-top: 1rem;
    font-weight: 500;
    color: var(--text-secondary);
}

.buttons {
    margin-top: 1rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}
</style>