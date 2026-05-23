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
    import { deleteRecord, queryOne, save } from "$lib/pocketbase";
    import { Collections, ProjectsTypeOptions, type CardsResponse, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { deepEqual } from "$lib/util";
    import { ChartColumnBig, Circle, Clock, Factory, Flag, Kanban, SquareKanban, Trash, Users } from "lucide-svelte";
    import { fade, fly } from "svelte/transition";
    import { getPriorityColor, priorities, type CardAssignmentData } from "../cards";
    import { localToZoned, tomorrowDate, zonedToLocal } from "$lib/datetime";
    import CardAssignmentValue from "./CardAssignmentValue.svelte";
    import ModalPanel from "$lib/components/ModalPanel.svelte";

    let {
        card = $bindable(),
        sections,
        subprojects,
        projectType,
        onclose
    }: {
        card: CardsResponse | null,
        sections: SectionsRecord[],
        subprojects: SubprojectsRecord[],
        projectType: ProjectsTypeOptions,
        onclose: () => void
    } = $props();

    const saveDebounce = 100;

    // Local editable copy so we don't clobber unsaved user edits when remote updates arrive
    let localCard = $state<CardsResponse | null>(null);

    // field -> last local edit timestamp (ms)
    const dirtyMap = new Map<keyof CardsResponse, number>();
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const creationUser = $derived(card?.created_by ? queryOne(Collections.Users, card.created_by) : null);

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
                localCard = structuredClone($state.snapshot(card));
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
        // This stringify actually does have side effects. It accesses all of
        // the properties of localCard so the effect will re-run whenever any
        // property, even deeply nested, changes.
        JSON.stringify(localCard);

        if(!localCard) {
            prevValues.clear();
            prevCardId = null;
            return;
        }

        // If we're applying server changes or just opened/switched cards, treat current values as baseline
        if(suppressDirty > 0 || prevCardId !== localCard.id) {
            console.log("Early snapshot exit");
            snapshotValues();
            return;
        }

        const now = Date.now();
        let anyChanged = false;
        for(const key of Object.keys(localCard) as (keyof CardsResponse)[]) {
            const next = localCard[key];
            const prev = prevValues.get(key);
            if(!deepEqual(prev, next)) {
                prevValues.set(key, $state.snapshot(next));
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


<ModalPanel open={localCard !== null} {onclose}>
{#if localCard} <!-- just for typing to recognize localCard !== null -->
    <header>
        <input type="text" bind:value={localCard.title} class="title" placeholder="Card title" />
    </header>

    <div class="card-content">
        <div class="field-group">
            <!-- Screenreader only -->
            <label for="description" aria-hidden="false" style="display: none;">Description</label>
            <textarea id="description" class="description" bind:value={localCard.description} placeholder="Add a more detailed description..." use:autoSize></textarea>
        </div>
        
        <h3><SquareKanban /> Task</h3>
        <div class="properties">
            <div class="property">
                <span class="prop-label"><ChartColumnBig />Section</span>
                <div class="prop-value">
                    <select id="section" name="section" bind:value={localCard.section} style="color: {sections.find(s => s.id === localCard?.section)?.color ?? 'inherit'}">
                        {#each sections as section}
                            <option value={section.id} style="color: {section.color ?? "inherit"}">{section.title}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="property">
                <span class="prop-label"><Flag />Priority</span>
                <div class="prop-value">
                    <select id="priority" name="priority" bind:value={localCard.priority} style="color: {getPriorityColor(localCard.priority)}">
                        {#each Object.entries(priorities) as [key, v]}
                            <option value={key} style="color: {v.color}">{v.label}</option>
                        {/each}
                    </select>
                </div>
            </div>

            {#if subprojects.length > 0}
                <div class="property">
                    <span class="prop-label"><Kanban />Subproject</span>
                    <div class="prop-value">
                        <select id="subproject" name="subproject" bind:value={localCard.subproject}>
                            <option value="">None</option>
                            {#each subprojects as subproject}
                                <option value={subproject.id}>{subproject.name}</option>
                            {/each}
                        </select>
                    </div>
                </div>
            {/if}

            <div class="property due-date">
                <span class="prop-label">
                    <Clock />
                    Due date
                    {#if localCard.due_by}
                        <button class="clear" onclick={() => localCard && (localCard.due_by = "")} title="Clear due date">
                            <Trash />
                        </button>
                    {/if}
                </span>
                <div class="prop-value">
                    {#if localCard.due_by}
                        <input id="due_date" type="datetime-local" bind:value={
                            () => localCard ? zonedToLocal(localCard.due_by) : "",
                            (v) => localCard && (localCard.due_by = localToZoned(v) ?? "")
                        } />
                        <div class="timetip">
                            {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(localCard.due_by))}
                        </div>
                    {:else}
                        <button class="add" onclick={() => localCard && (localCard.due_by = tomorrowDate().toISOString())}>+ Assign Due Date</button>
                    {/if}
                </div>
            </div>

            <div class="property assignment">
                <span class="prop-label">
                    <Users />
                    Assignment
                    {#if localCard.assignment_data}
                        <button class="clear" onclick={() => localCard && (localCard.assignment_data = null)} title="Clear assignment">
                            <Trash />
                        </button>
                    {/if}
                </span>
                <CardAssignmentValue
                    bind:assignmentData={localCard.assignment_data as CardAssignmentData}
                    bind:userCache={localCard.user_assignment_cache}
                    bind:groupCache={localCard.group_assignment_cache}
                />
            </div>
        </div>

        {#if projectType === "manufacturing"}
            <h3><Factory /> Manufacturing</h3>
            <!-- TEMPORARY -->
            <div class="properties">
                <div class="property">
                    <span class="prop-label"><Circle />Material</span>
                    <div class="prop-value">
                        <input type="text" placeholder="e.g. Aluminum" />
                    </div>
                </div>
                <div class="property">
                    <span class="prop-label"><Circle />Machine</span>
                    <div class="prop-value">
                        <input type="text" placeholder="e.g. Mill" />
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <hr />

    <footer>
        <div class="metadata">
            <span>
                Created by
                {#if creationUser === null}
                    Unknown User
                {:else}
                    {#await creationUser}
                        Loading user...
                    {:then user}
                        {user?.name ?? "Unknown User"}
                    {/await}
                {/if}
                on {new Date(localCard.created).toLocaleString()}
            </span>
            <span>Last updated {new Date(localCard.updated).toLocaleString()}</span>
            <span>Moved sections at {new Date(localCard.moved_at).toLocaleString()}</span>
        </div>
        
        <button onclick={deleteCard} class="delete"><Trash /> Delete Card</button>
    </footer>
{/if}
</ModalPanel>

<style lang="scss">
@use "props.scss";

header {
    margin-bottom: 0.5rem;

    .title {
        font-size: var(--font-large);
        font-weight: 600;
        width: 100%;
        margin: 0;
        padding: 0.25rem 0.5rem;
        --bg-color: transparent;
    }
}

.card-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    overflow-y: auto;
}

.description {
    --bg-color: transparent;
    padding: 0.25rem 0.75rem;
    border-left: 1px solid var(--border);
    border-radius: 0 4px 4px 0;
    width: 100%;
}

h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    font-size: var(--font-medium);
    font-weight: 500;
}

.due-date {
    font-size: var(--font-tiny);

    input {
        width: min-content;
    }
    
    .timetip {
        color: var(--text-tertiary);
        padding-left: 0.5rem;
        padding-top: 0.25rem;
    }
}

.assignment {
    grid-column: span 2;
}

hr {
    margin: 1rem 0;
}
footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--bg-primary);
    
    .metadata {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);
    }
    button.delete {
        color: var(--error);
        --bg-color: transparent;
        padding: 0.5rem 1rem;
    }
}
</style>