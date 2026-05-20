<!--
This component has a bit more state management than you'd expect because we want to reasonably
handle concurrent edits and not create update loops when the card is updated externally during
saving. The localCard represents the current editable state of the card, while the dirtyMap
tracks which fields have unsaved local changes. When a new card prop is received, we merge it
into localCard but do not overwrite any fields that have been edited locally after the last
save. This allows us to keep user edits intact while still reflecting remote updates.
-->

<script lang="ts">
    import { autoSize } from "$lib/actions";
    import { deleteRecord, save } from "$lib/pocketbase";
    import { Collections, type CardsResponse, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { deepEqual, unproxy } from "$lib/util";
    import { ChartColumnBig, Clock, Flag, Kanban, PencilLine, Trash } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";
    import { getPriorityColor, priorities } from "./cards";
    import { localToZoned, tomorrowDate, zonedToLocal } from "$lib/datetime";

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
            if(!deepEqual(prev, next)) {
                prevValues.set(key, next);
                dirtyMap.set(key, now);
                console.log(`Field ${key} changed locally; marking dirty (prev: ${prev}, next: ${next})`);
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

<svelte:document onkeydown={(e) => {
    if(e.key === "Escape" && localCard !== null) {
        onclose();
        e.preventDefault();
        e.stopImmediatePropagation();
    }
}} />

{#if localCard !== null}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="backdrop" onclick={(e) => {
        if(e.target === e.currentTarget) onclose();
    }} transition:fade={{ duration: 200 }}>
        <div class="panel" transition:slide={{ duration: 200, axis: "x" }}>
            <section>
                <input type="text" bind:value={localCard.title} class="title" placeholder="Card title" />
                <textarea class="description" bind:value={localCard.description} placeholder="Card description..." use:autoSize></textarea>
            </section>
            
            <section class="options">
                <div class="option">
                    <label for="section"><ChartColumnBig />Section</label>
                    <select id="section" name="section" bind:value={localCard.section} style="color: {sections.find(s => s.id === localCard?.section)?.color ?? 'inherit'}">
                        {#each sections as section}
                            <option value={section.id} style="color: {section.color ?? "inherit"}">{section.title}</option>
                        {/each}
                    </select>
                </div>
    
                <div class="option">
                    <label for="priority"><Flag />Priority</label>
                    <select id="priority" name="priority" bind:value={localCard.priority} style="color: {getPriorityColor(localCard.priority)}">
                        {#each Object.entries(priorities) as [key, v]}
                            <option value={key} style="color: {v.color}">{v.label}</option>
                        {/each}
                    </select>
                </div>

                {#if subprojects.length > 0}
                    <div class="option">
                        <label for="subproject"><Kanban />Subproject</label>
                        <select id="subproject" name="subproject" bind:value={localCard.subproject}>
                            <option value="">None</option>
                            {#each subprojects as subproject}
                                <option value={subproject.id}>{subproject.name}</option>
                            {/each}
                        </select>
                    </div>
                {/if}
            </section>

            <div class="option">
                <label for="due_date"><Clock />Due Date</label>
                <div style="display: flex; gap: 0.5rem;">
                    {@debug localCard}
                    {#if localCard.due_by}
                        <input id="due_date" type="datetime-local" bind:value={
                            () => localCard ? zonedToLocal(localCard.due_by) : "",
                            (v) => localCard && (localCard.due_by = localToZoned(v) ?? "")
                        } />
                        <button onclick={() => localCard && (localCard.due_by = "")}>Clear due date</button>
                    {:else}
                        <button onclick={() => localCard && (localCard.due_by = tomorrowDate().toISOString())}>+ Assign Due Date</button>
                    {/if}
                </div>
                {#if localCard.due_by}
                    <span class="timetip">
                        ({new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(localCard.due_by))})
                    </span>
                {/if}
            </div>

            <section>
                <span class="label">Information</span>
                <table>
                    <tbody>
                        <tr>
                            <td class="item">Created by:</td>
                            <td>{localCard.created_by}</td>
                        </tr>
                        <tr>
                            <td class="item">Created at:</td>
                            <td>{new Date(localCard.created).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td class="item">Updated at:</td>
                            <td>{new Date(localCard.updated).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td class="item">Moved sections at:</td>
                            <td>{new Date(localCard.moved_at).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="buttons">
                <button onclick={deleteCard} class="delete"><Trash />Delete</button>
            </section>
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
    gap: 1.5rem;
}

.title {
    font-size: var(--font-large);
    font-weight: 600;
    margin: 0;
    padding: 0.25rem 0.5rem;
    --bg-color: transparent;
}

.description {
    font-size: var(--font-medium);
    padding: 0.25rem 0.75rem;
    border-left: 1px solid var(--border);
    --bg-color: transparent;
    border-radius: 0 4px 4px 0;
}
label, .label {
    font-weight: 500;
    color: var(--text-secondary);

    display: flex;
    align-items: center;
    gap: 0.25rem;
}

section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    &.buttons {
        gap: 0.5rem;
        justify-content: flex-end;
        flex-direction: row;
        margin: 0.25rem 0;
        font-size: var(--font-medium);

        .delete {
            color: var(--error);
        }
    }
}

table {
    font-size: var(--font-tiny);
    border-collapse: collapse;

    td {
        color: var(--text-secondary);
        padding: 0.25rem 0.5rem;
    }
    .item {
        color: var(--text-tertiary);
        width: 150px;
    }
}

.options {
    display: grid;
    gap: 0.5rem 1rem;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.option {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    select, input {
        // --bg-color: color-mix(in srgb, var(--bg-primary) 50%, var(--bg-secondary) 50%);
        --bg-color: transparent;
        padding: 0.25rem 0.5rem;
    }

    .timetip {
        font-size: var(--font-small);
        color: var(--text-secondary);
        margin-left: 0.5rem;
    }
}
</style>