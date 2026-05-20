<!--
This component has a bit more state management than you'd expect because we want to reasonably
handle concurrent edits and not create update loops when the card is updated externally during
saving. The localCard represents the current editable state of the card, while the dirtyMap
tracks which fields have unsaved local changes. When a new card prop is received, we merge it
into localCard but do not overwrite any fields that have been edited locally after the last
save. This allows us to keep user edits intact while still reflecting remote updates.
-->

<script lang="ts">
    import { deleteRecord, save } from "$lib/pocketbase";
    import { Collections, type CardsResponse, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { unproxy } from "$lib/util";
    import { Trash } from "lucide-svelte";
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

    const saveDebounce = 100;

    // Local editable copy so we don't clobber unsaved user edits when remote updates arrive
    let localCard: CardsResponse | null = $state(null);
    // field -> last local edit timestamp (ms)
    const dirtyMap = new Map<keyof CardsResponse, number>();
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    let suppressDirty = 0;
    let prevCardId: string | null = null;
    const prevValues = new Map<keyof CardsResponse, unknown>();

    /**
     * Run a function while temporarily suppressing dirty tracking;
     * used when applying incoming prop changes or server updates to avoid marking those fields as dirty.
     */
    function withSuppressedDirty<T>(fn: () => T): T {
        suppressDirty += 1;
        try {
            return fn();
        } finally {
            suppressDirty -= 1;
        }
    }

    // Initialize or merge incoming `card` prop changes without overwriting local unsaved edits
    $effect(() => {
        if(card == null) {
            withSuppressedDirty(() => {
                localCard = null;
            });
            dirtyMap.clear();
            if(saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
        } else if(localCard == null || card.id !== localCard.id) {
            // first time open
            withSuppressedDirty(() => {
                localCard = structuredClone(unproxy(card));
            });
            dirtyMap.clear();
        } else {
            mergeServerRecord(card);
        }
    });

    /** Snapshot the current values of the local card */
    function snapshotValues() {
        if(!localCard) return;
        prevCardId = localCard.id;
        prevValues.clear();
        for(const key of Object.keys(localCard) as (keyof CardsResponse)[]) {
            prevValues.set(key, localCard[key]);
        }
    }

    // Dirty tracking
    $effect(() => {
        if(!localCard) {
            prevValues.clear();
            prevCardId = null;
            return;
        }

        const currentCardId = localCard.id;

        // If we're applying server changes or just opened/switched cards, treat current values as baseline
        if(suppressDirty > 0 || prevCardId !== currentCardId) {
            snapshotValues();
            return;
        }

        const now = Date.now();
        let anyChanged = false;
        for(const key of Object.keys(localCard) as (keyof CardsResponse)[]) {
            const next = localCard[key];
            const prev = prevValues.get(key);
            if(!Object.is(prev, next)) {
                prevValues.set(key, next);
                dirtyMap.set(key, now);
                anyChanged = true;
            }
        }

        if(anyChanged) debounceSave();
    });

    function debounceSave() {
        if(saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => performSave(), saveDebounce);
    }

    async function performSave() {
        if(!localCard) return;

        try {
            await save(Collections.Cards, localCard, { create: false });
        } finally {
            if(saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
        }
    }

    /**
     * Merge an updated server record into localCard, but do not overwrite fields that the user has edited locally
     * after the given request timestamp. This allows us to keep the local unsaved edits while still updating any
     * fields that were changed remotely or locally before the last save.
     */
    function mergeServerRecord(serverRec: CardsResponse) {
        if(!localCard) {
            withSuppressedDirty(() => {
                localCard = structuredClone(serverRec);
            });
            dirtyMap.clear();
            return;
        }

        // For each field in serverRec, update local value unless user has a more recent local edit
        withSuppressedDirty(() => {
            for(const key of Object.keys(serverRec) as (keyof CardsResponse)[]) {
                const localDirtyTs = dirtyMap.get(key) ?? 0;
                // If the user has edited this field locally after the last save, skip applying the server update for this field
                if(localDirtyTs > 0) continue;
                
                // Apply server value
                (localCard as any)[key] = serverRec[key];
            }
        });
    }

    function deleteCard() {
        const id = localCard?.id ?? card?.id;
        if(!id) return;
        deleteRecord(Collections.Cards, id);
    }
</script>

{#if localCard !== null}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="backdrop" onclick={(e) => {
        if(e.target === e.currentTarget) onclose();
    }} transition:fade={{ duration: 200 }}>
        <div class="panel" transition:slide={{ duration: 200, axis: "x" }}>
            <input type="text" bind:value={localCard.title} class="title" placeholder="Card title" />
            <textarea class="description" bind:value={localCard.description} placeholder="Card description..."></textarea>

            <div class="horizontal-options">
                <div class="option">
                    <label for="section">Section</label>
                    <select id="section" name="section" bind:value={localCard.section}>
                        {#each sections as section}
                            <option value={section.id} style="color: {section.color ?? "inherit"}">{section.title}</option>
                        {/each}
                    </select>
                </div>
    
                <div class="option">
                    <label for="priority">Priority</label>
                    <select id="priority" name="priority" bind:value={localCard.priority}>
                        <option value="low" style="color: lightgray">Low</option>
                        <option value="medium" style="color: gold">Medium</option>
                        <option value="high" style="color: orange">High</option>
                        <option value="critical" style="color: red">Critical</option>
                    </select>
                </div>
            </div>

            {#if subprojects.length > 0}
                <label for="subproject">Subproject</label>
                <select id="subproject" name="subproject" bind:value={localCard.subproject}>
                    <option value="">None</option>
                    {#each subprojects as subproject}
                        <option value={subproject.id}>{subproject.name}</option>
                    {/each}
                </select>
            {/if}

            <span class="label">Actions</span>
            <div class="buttons">
                <button onclick={deleteCard} class="delete"><Trash />Delete</button>
            </div>

            <span class="label">Information</span>
            <table>
                <tbody>
                    <tr>
                        <td class="label">Created by:</td>
                        <td>{localCard.created_by}</td>
                    </tr>
                    <tr>
                        <td class="label">Created at:</td>
                        <td>{new Date(localCard.created).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td class="label">Updated at:</td>
                        <td>{new Date(localCard.updated).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td class="label">Moved sections at:</td>
                        <td>{new Date(localCard.moved_at).toLocaleString()}</td>
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

.horizontal-options {
    display: flex;
    gap: 1rem;

    .option {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
}
</style>