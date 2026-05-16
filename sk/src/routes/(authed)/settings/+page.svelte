<script lang="ts">
import { updateConfig, configTypes, getConfig } from "$lib/config";
import type { AppConfig, ConfigPath, ConfigValueType } from "$lib/config";
import { metadata } from "$lib/metadata";

$effect(() => {
    $metadata.title = "Application settings";
});

let config: AppConfig = getConfig();
let saving = $state(false);

const categories = Object.keys(configTypes).reduce((acc, path) => {
    const [category, key] = path.split("/");
    if(!acc[category]) acc[category] = [];
    
    acc[category].push({ 
        path: path as ConfigPath,
        key,
        type: configTypes[path as keyof typeof configTypes] 
    });
    return acc;
}, {} as Record<string, { path: ConfigPath, key: string, type: ConfigValueType }[]>);

async function handleSave(path: ConfigPath, value: string | boolean | number) {
    saving = true;
    try {
        await updateConfig(path, value as any);
    } catch (e) {
        console.error("Failed to save config:", e);
    }
    saving = false;
}
</script>

<div class="layout">
    <div class="header">
        <h1>Settings</h1>
        {#if saving}<span class="saving">Saving...</span>{/if}
    </div>

    <!-- TODO (priority low): Dropdown type for auth provider -->
    <!-- TODO (priority low): Way to see/upload to the `files` table and reference files from URL fields -->

    <div class="settings">
        {#if config}
            {#each Object.entries(categories) as [category, items]}
                <section>
                    <h2>{category.charAt(0).toUpperCase() + category.slice(1)}</h2>
                    <div class="fields">
                        {#each items as item}
                            <div class="field">
                                <label for={item.path}>{item.type.name || item.key} <span class="required">{item.type.optional ? '' : '*'}</span></label>
                                {#if item.type.type === 'string'}
                                    <input 
                                        id={item.path} 
                                        type="text" 
                                        bind:value={(config as any)[category][item.key]}
                                        onchange={(e) => handleSave(item.path, (e.target as HTMLInputElement).value)}
                                    />
                                {:else if item.type.type === 'boolean'}
                                    <input 
                                        id={item.path} 
                                        type="checkbox" 
                                        bind:checked={(config as any)[category][item.key]}
                                        onchange={(e) => handleSave(item.path, (e.target as HTMLInputElement).checked)}
                                    />
                                {:else if item.type.type === 'number'}
                                    <input 
                                        id={item.path} 
                                        type="number" 
                                        bind:value={(config as any)[category][item.key]}
                                        onchange={(e) => handleSave(item.path, Number((e.target as HTMLInputElement).value))}
                                    />
                                {/if}
                            </div>
                        {/each}
                    </div>
                </section>
            {/each}
        {:else}
            <p>Loading settings...</p>
        {/if}

        <div>
            <hr />
            <p>Other settings can be found in the <a href="/_/">PocketBase admin dashboard.</a></p>
        </div>
    </div>
</div>

<style lang="scss">
.layout {
    overflow: auto;
    max-height: 100%;
    padding: 1rem;
    overflow: auto;
}

.header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
}
.saving {
    color: var(--text-secondary);
    font-size: var(--font-small);
}
.settings {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
}
section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    
    h2 {
        border-bottom: 1px solid var(--border);
        padding-bottom: 0.5rem;
    }
}

.fields {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    
    label {
        font-weight: 500;
        color: var(--text-secondary);

        .required {
            color: var(--error);
            font-weight: normal;
            font-size: 0.8em;
        }
    }
    input {
        margin: 0 0.5rem;
    }
}
</style>