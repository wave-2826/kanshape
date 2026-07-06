<script lang="ts">
    import type { CustomCardFields } from "$lib/data/project";
    import LeftPaneChooser from "../LeftPaneChooser.svelte";
    import CardFieldSchemaEditor from "./CardFieldSchemaEditor.svelte";

    let {
        customFields = $bindable(), background
    }: {
        customFields: CustomCardFields | null,
        background?: string
    } = $props();
</script>

<LeftPaneChooser
    options={Object.entries(customFields ?? {}).map(([id, field]) => ({
        name: field.name ?? "", tooltip: `${field.description ?? ""}\n\nid: ${id}`
    })) ?? []}
    oncreate={() => {
        if(!customFields) customFields = {};
        // uuids are too long, so we just use a random 6-character string for the id
        // we don't need to worry about collisions or anything idk
        const id = Math.random().toString(36).substring(2, 8);
        customFields[id] = { name: `New field`, type: { base: "text" }, description: "" };
    }}
    ondelete={(option) => {
        if(!customFields) return;
        const id = Object.keys(customFields)[option];
        delete customFields[id];
    }}
    compact
    {background}
>
    {#snippet pane(selected)}
        {#if customFields}
            <div class="custom-card-field">
                <input type="text" placeholder="Field name" bind:value={customFields[Object.keys(customFields)[selected]].name} />
                
                <label for="field-description">Field description</label>
                <textarea id="field-description" placeholder="Field description (optional)" bind:value={customFields[Object.keys(customFields)[selected]].description}></textarea>
            
                <span class="label">Field type</span>
                <CardFieldSchemaEditor bind:type={customFields[Object.keys(customFields)[selected]].type} />
            </div>
        {/if}
    {/snippet}
</LeftPaneChooser>

<style lang="scss">
// TODO: more consistent shared styles, here and in LinkedSiteDetails
.custom-card-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.5rem;

    input, textarea {
        width: 100%;
    }

    label, .label {
        margin: 0.25rem 0 0 0.25rem;
        font-size: var(--font-small);
    }
}
</style>