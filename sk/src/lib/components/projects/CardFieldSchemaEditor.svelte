<script lang="ts">
    import type { CardMetadataFieldType } from "$lib/data/project";
    import { Plus, X } from "lucide-svelte";
    import CardFieldSchemaEditor from "./CardFieldSchemaEditor.svelte";

    let {
        type = $bindable()
    }: {
        type: CardMetadataFieldType<false>
    } = $props();
</script>

<div class="type-editor">
    <select bind:value={
        () => type.base,
        (v) => {
            type = { base: v } as CardMetadataFieldType<false>;
            if(type.base === "user" || type.base === "group" || type.base === "file") {
                type.multi = false;
            } else if(type.base === "list") {
                type.fieldName = "";
                type.field = { base: "text" };
            } else if(type.base === "tuple") {
                type.fields = [{ base: "text" }];
            } else if(type.base === "select") {
                type.options = [{
                    id: Math.random().toString(36).substring(2, 10),
                    value: "Option 1"
                }];
            }
        }
    }>
        <option value="text">Text</option>
        <option value="longtext">Long Text</option>
        <option value="number">Number</option>
        <option value="checkbox">Checkbox</option>
        <option value="url">URL</option>
        <option value="date">Date</option>
        <option value="onshape_part">Onshape Part</option>
        <option value="user">User(s)</option>
        <option value="group">Group(s)</option>
        <option value="file">File(s)</option>
        <option value="list">List</option>
        <option value="tuple">Multiple</option>
        <option value="select">Select</option>
    </select>

    {#if type.base === "user" || type.base === "group" || type.base === "file"}
        <div class="child">
            <div class="line"></div>
            <label>
                Allow multiple
                <input type="checkbox" bind:checked={type.multi} />
            </label>
        </div>
    {:else if type.base === "list"}
        <div class="child">
            <div class="line"></div>
            <label title="What are these items defining? e.g. 'task' or 'step'">
                Field name
                <input type="text" bind:value={type.fieldName} />
            </label>
        </div>
        <div class="child">
            <div class="line"></div>
            <span class="label">
                Item type
            </span>
            <CardFieldSchemaEditor bind:type={type.field} />
        </div>
    {:else if type.base === "tuple"}
        {#each type.fields as field, i (i)}
            <div class="child horizontal-field">
                <div class="line"></div>
                <button class="remove-field" title="Remove field" onclick={() => {
                    if(type.base !== "tuple") return;
                    type.fields = type.fields.filter((_, j) => j !== i);
                }}><X /></button>
                <CardFieldSchemaEditor bind:type={type.fields[i]} />
            </div>
        {/each}

        <div class="child">
            <div class="line"></div>
            <button class="add-field" onclick={() => {
                if(type.base !== "tuple") return;
                type.fields = [...type.fields, { base: "text" }];
            }}>
                <Plus /> Add
            </button>
        </div>
    {:else if type.base === "select"}
        <div class="child">
            <div class="line"></div>
            <label title="Should users be able to enter a value that isn't in the list of options?">
                Allow other
                <input type="checkbox" bind:checked={type.allow_other} />
            </label>
        </div>

        <div class="child">
            <div class="line"></div>
            <span class="label">
                Options
            </span>

            {#each type.options as option, i (option.id)}
                <div class="child horizontal-field">
                    <div class="line"></div>
                    <button class="remove-field" title="Remove option" onclick={() => {
                        if(type.base !== "select") return;
                        type.options = type.options.filter((_, j) => j !== i);
                    }}><X /></button>
                    <input type="text" bind:value={option.value} oninput={(e) => {
                        if(type.base !== "select") return;
                        type.options[i].value = (e.target as HTMLInputElement).value;
                    }} />
                </div>
            {/each}

            <div class="child">
                <div class="line"></div>
                <button class="add-field" onclick={() => {
                    if(type.base !== "select") return;
                    type.options = [...type.options, {
                        id: Math.random().toString(36).substring(2, 10),
                        value: ""
                    }];
                }}>
                    <Plus /> Add
                </button>
            </div>
        </div>
    {/if}
</div>

<!-- svelte-ignore css_unused_selector - yeah, yeah -->
<style lang="scss">
    .type-editor {
        display: flex;
        flex-direction: column;

        flex: 1;
        min-width: 0;
    }

    select, button {
        align-self: flex-start;
        padding-right: 0.75rem;
    }

    .child {
        display: flex;
        flex-direction: column;

        margin-left: 0.5rem;
        padding-left: 1rem;
        position: relative;

        &:nth-child(2) {
            margin-top: 0.5rem;
        }

        > .line {
            --line-offset: 0.8rem;

            border-left: 2px solid var(--border);
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
        }
        &:last-child > .line {
            border-left-color: var(--bg-secondary);
        }
        &:last-child > .line::after {
            content: "";
            border-left: 2px solid var(--border);
            position: absolute;
            top: 0;
            height: var(--line-offset);
            left: -2px;
        }

        > .line::before {
            content: "";
            border-bottom: 2px solid var(--border);
            position: absolute;
            top: var(--line-offset);
            left: -2px;
            width: 0.5rem;
        }
    }

    label, .label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.25rem;
    }

    input {
        padding: 0.25rem 0.5rem;
    }

    .horizontal-field {
        display: flex;
        flex-direction: row;
        padding-bottom: 0.25rem;
        align-items: flex-start;
        gap: 0.25rem;

        .remove-field {
            color: color-mix(var(--error), var(--text-secondary) 50%);
            padding: 0.25rem;
            transition: color 0.2s;

            &:hover {
                color: var(--error);
            }
        }
    }
</style>