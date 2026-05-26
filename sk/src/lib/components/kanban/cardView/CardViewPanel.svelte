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
    import { deleteRecord, queryOne, save, stripExpand } from "$lib/pocketbase";
    import { Collections, ProjectsTypeOptions, type CardsResponse, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { ChartColumnBig, Circle, Clock, Factory, Flag, Kanban, SquareKanban, Trash, Users } from "lucide-svelte";
    import { getPriorityColor, priorities, type CardAssignmentData } from "../cards";
    import { localToZoned, tomorrowDate, zonedToLocal } from "$lib/datetime";
    import CardAssignmentValue from "./CardAssignmentValue.svelte";
    import ModalPanel from "$lib/components/ModalPanel.svelte";
    import type { TypedCardPreviewResponse } from "../kanban";
    import { DirtyTracker, DirtyTrackerState } from "./dirtyTracker.svelte";
    import { onDestroy, untrack } from "svelte";

    let {
        card = $bindable(),
        sections,
        subprojects,
        projectType,
        onclose
    }: {
        card: TypedCardPreviewResponse | null,
        sections: SectionsRecord[],
        subprojects: SubprojectsRecord[],
        projectType: ProjectsTypeOptions,
        onclose: () => void
    } = $props();

    /**
     * This panel shows a full card, but the card we get is a preview (with limited fields so we
     * don't send unnecessary data for the full board). This constructs a partial full card from
     * the preview data to use as our local editable state.
     */
    function constructPartialFullCard(preview: TypedCardPreviewResponse): CardsResponse {
        return {
            collectionId: Collections.Cards,
            collectionName: Collections.Cards,

            id: preview.id,
            title: preview.title,
            description: "Loading...", // don't show a truncated description while loading the full one
            priority: preview.priority,
            due_by: preview.due_by,
            section: preview.section,
            subproject: preview.subproject,
            created: preview.created,
            updated: preview.updated,
            moved_at: preview.moved_at,
            created_by: preview.created_by,
            assignment_data: preview.assignment_data,
            position: preview.position,
            project: preview.project,
            metadata: {}
        };
    }

    const saveDebounce = 200;

    let tracker = $state<DirtyTracker<CardsResponse, TypedCardPreviewResponse> | null>(null);
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const creationUser = $derived(card?.created_by ? queryOne(Collections.Users, card.created_by) : null);

    // Initialize or merge incoming `card` prop changes
    $effect(() => {
        if(card == null) {
            console.log("No card selected, closing panel");
            if(tracker) {
                tracker.destroy();
                tracker = null;
            }
            if(saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
        } else if(!tracker) {
            console.log("Card selected, initializing tracker");
            untrack(() => {
                tracker = new DirtyTracker<CardsResponse, TypedCardPreviewResponse>(
                    $state.snapshot(card),
                    {
                        transformExternal: (ext) => constructPartialFullCard($state.snapshot(ext)),
                        fetchFull: async (id) => {
                            return await queryOne(Collections.Cards, id) as CardsResponse;
                        }
                    }
                );
            });
        } else {
            console.log("Card updated externally, merging changes");
            tracker.updateExternal($state.snapshot(card));
        }
    });

    onDestroy(() => {
        if(tracker) tracker.destroy();
        if(saveTimer) clearTimeout(saveTimer);
    });

    // Auto-save when dirty
    $effect(() => {
        if(!tracker) return;

        // Trigger reactivity on deeply nested properties
        JSON.stringify(tracker.current);

        if(tracker.shouldSave) {
            debounceSave();
        }
    });

    function debounceSave() {
        if(saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => performSave(), saveDebounce);
    }
    
    async function performSave() {
        if(!tracker) return;

        try {
            await save(Collections.Cards, stripExpand(tracker.current), {
                create: false,
                expand: ""
            });
            tracker?.clearDirty();
        } finally {
            if(saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
        }
    }

    function deleteCard() {
        const id = tracker?.current?.id ?? card?.id;
        if(!id) return;
        deleteRecord(Collections.Cards, id);
    }
</script>


<ModalPanel open={tracker !== null} {onclose}>
{#if tracker}
    {@const localCard = tracker.current}
    <header>
        <input type="text" bind:value={localCard.title} class="title" placeholder="Card title" disabled={tracker.loadingFull} />
    </header>

    <div class="card-content">
        <div class="field-group">
            <!-- Screenreader only -->
            <label for="description" aria-hidden="false" style="display: none;">Description</label>
            <textarea
                id="description"
                class="description"
                bind:value={localCard.description}
                placeholder="Add a more detailed description..."
                use:autoSize={localCard.description}
                disabled={tracker.loadingFull}
            ></textarea>
        </div>
        
        <h3><SquareKanban /> Task</h3>
        <div class="properties">
            <div class="property">
                <span class="prop-label"><ChartColumnBig />Section</span>
                <div class="prop-value">
                    <select
                        id="section"
                        name="section"
                        bind:value={localCard.section}
                        style="color: {sections.find(s => s.id === localCard?.section)?.color ?? 'inherit'}"
                        disabled={tracker.loadingFull}
                    >
                        {#each sections as section}
                            <option value={section.id} style="color: {section.color ?? "inherit"}">{section.title}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="property">
                <span class="prop-label"><Flag />Priority</span>
                <div class="prop-value">
                    <select
                        id="priority"
                        name="priority"
                        bind:value={localCard.priority}
                        style="color: {getPriorityColor(localCard.priority)}"
                        disabled={tracker.loadingFull}
                    >
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
                        <select
                            id="subproject"
                            name="subproject"
                            bind:value={localCard.subproject}
                            disabled={tracker.loadingFull}
                        >
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
                        <button class="clear" onclick={() => localCard.due_by = ""} title="Clear due date">
                            <Trash />
                        </button>
                    {/if}
                </span>
                <div class="prop-value">
                    {#if localCard.due_by}
                        <input id="due_date" type="datetime-local" bind:value={
                            () => zonedToLocal(localCard.due_by),
                            (v) => localCard.due_by = localToZoned(v) ?? ""
                        } />
                        <div class="timetip">
                            {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(localCard.due_by))}
                        </div>
                    {:else}
                        <button class="add" onclick={() => localCard.due_by = tomorrowDate().toISOString()}>+ Assign Due Date</button>
                    {/if}
                </div>
            </div>

            <div class="property assignment">
                <span class="prop-label">
                    <Users />
                    Assignment
                    {#if localCard.assignment_data}
                        <button class="clear" onclick={() => localCard.assignment_data = null} title="Clear assignment">
                            <Trash />
                        </button>
                    {/if}
                </span>
                <CardAssignmentValue
                    bind:assignmentData={localCard.assignment_data as CardAssignmentData}
                    nameCache={card?.assignment_name_cache ?? []}
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
                        <input type="text" placeholder="e.g. Aluminum" disabled={tracker.loadingFull} />
                    </div>
                </div>
                <div class="property">
                    <span class="prop-label"><Circle />Machine</span>
                    <div class="prop-value">
                        <input type="text" placeholder="e.g. Mill" disabled={tracker.loadingFull} />
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
    overflow-x: hidden;
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
    
    .metadata {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);
        white-space: nowrap;
        // yeah, this just overflows. we go with it.
        max-width: 50%;
    }
    button.delete {
        color: var(--error);
        --bg-color: transparent;
        padding: 0.5rem 1rem;
    }
}
</style>