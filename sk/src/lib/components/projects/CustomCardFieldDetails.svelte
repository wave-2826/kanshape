<script lang="ts">
    import type { CardMetadataFieldType } from "$lib/data/metadata";
    import type { CustomCardFields } from "$lib/data/project";
    import { showAlert } from "$lib/site";
    import LeftPaneChooser from "../LeftPaneChooser.svelte";
    import CardFieldSchemaEditor from "../kanban/cardView/schemaEditor/CardFieldSchemaEditor.svelte";

    let {
        customFields = $bindable(), background
    }: {
        customFields: CustomCardFields | null,
        background?: string
    } = $props();

    const fieldPresets: {
        name: string;
        type: CardMetadataFieldType;
    }[] = [
        { name: "Checklist", type: {
            base: "list",
            fieldName: "item",
            field: {
                base: "tuple",
                fields: [{ base: "checkbox" }, { base: "text" }]
            }
        } },
        { name: "Part/assembly list", type: {
            base: "list",
            fieldName: "part",
            field: {
                base: "onshape_part"
            }
        } }
    ];
</script>

<!-- TODO: allow reordering custom card fields. would require storing an array instead of an object :p -->
<LeftPaneChooser
    options={Object.entries(customFields ?? {}).map(([id, field]) => ({
        name: field.name ?? "", tooltip: `${field.description ?? ""}\n\nid: ${id}`, key: id
    })) ?? []}
    oncreate={() => {
        if(!customFields) customFields = {};
        // uuids are unnecessarily long, so we just use a random 6-character string for the id
        // we don't need to worry about collisions or anything idk
        const id = Math.random().toString(36).substring(2, 8);
        if(customFields[id]) {
            showAlert({
                severity: "error",
                title: "Failed to create custom field",
                text: "go buy a lottery ticket bc this is very very unlikely to ever happen"
            });
            return;
        }
        customFields[id] = { name: `New field`, type: { base: "empty" }, description: "" };
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
            {@const field = customFields[selected]}
            <div class="custom-card-field">
                <input type="text" placeholder="Field name" bind:value={field.name} />
                
                <label for="field-description">Field description</label>
                <textarea id="field-description" placeholder="Field description (optional)" bind:value={field.description}></textarea>
            
                <span class="label">Field type</span>
                <CardFieldSchemaEditor bind:type={field.type} />

                {#if field.type.base === "empty"}
                    <p class="empty">This field has no type. Try a preset!</p>
                    <div class="presets">
                        {#each fieldPresets as preset}
                            <button onclick={() => field.type = preset.type}>{preset.name}</button>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    {/snippet}
</LeftPaneChooser>

<style lang="scss">
// TODO: more consistent shared styles, here and in LinkedSiteDetails
.empty {
    font-style: italic;
    color: var(--text-secondary);
    margin: 0.5rem 0.5rem 0 0.5rem;
}
.presets {
    margin: 0 0.5rem;
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
}
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