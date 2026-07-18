<!--
This component has a bit more state management than you'd expect because we want to reasonably
handle concurrent edits and not create update loops when the card is updated externally during
saving. The localCard represents the current editable state of the card, while the dirtyMap
tracks which fields have unsaved local changes. When a new card prop is received, we merge it
into localCard but do not overwrite any fields that have been edited locally after the last
save. This allows us to keep user edits intact while still reflecting remote updates.
-->

<script lang="ts" module>
    import { createContext, onDestroy, tick, untrack } from "svelte";
    
    type UploadContext = {
        queueUpload(name: string, file: File): void;
        update(): void;
    };
    export const [getUploadContext, setUploadContext] = createContext<UploadContext>();
</script>

<script lang="ts">
    import { autoSize } from "$lib/actions";
    import { client, queryOne, save, stripExpand, type ExpandResponse } from "$lib/pocketbase";
    import { Collections, type FileNameString, type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { Calendar, ChartColumnBig, Clock, FileQuestionMark, Flag, Kanban, ListTree, SquareKanban, Timer, Trash, Users } from "lucide-svelte";
    import { getPriorityColor, priorities, type CardAssignmentData, type TypedCardsResponse, type CardMetadata } from "../../../data/cards";
    import { localToZoned, tomorrowDate, zonedToLocal } from "$lib/datetime";
    import CardAssignmentValue from "./CardAssignmentValue.svelte";
    import ModalPanel from "$lib/components/ModalPanel.svelte";
    import { DirtyTracker } from "./dirtyTracker.svelte";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import InlineSelector from "$lib/components/InlineSelector.svelte";
    import { getCardMetadataItems, getExtraMetadataItems, walkMetadataValues, type MetadataFile, type TypedBoardsResponse } from "$lib/data/project";
    import CardFieldCategory from "./CardFieldCategory.svelte";
    import { debounce } from "$lib/util";
    import CardViewFooter from "./CardViewFooter.svelte";
    import CardDependencySelector from "./CardDependencySelector.svelte";

    let {
        board,
        boardCards,
        card = $bindable(),
        sections,
        subprojects,
        onclose
    }: {
        board: TypedBoardsResponse & ExpandResponse<"boards", "sections"> | null,
        boardCards: TypedCardPreviewResponse[],
        card: TypedCardPreviewResponse | null,
        sections: SectionsRecord[],
        subprojects: SubprojectsRecord[],
        onclose: () => void
    } = $props();

    let selectingCard = $state<{
        message: string;
        callback: (card: TypedCardPreviewResponse, originalCard: TypedCardsResponse) => void;
        originalSelection: string;
    } | null>(null);

    /**
     * This panel shows a full card, but the card we get is a preview (with limited fields so we
     * don't send unnecessary data for the full board). This constructs a partial full card from
     * the preview data to use as our local editable state.
     */
    function constructPartialFullCard(preview: TypedCardPreviewResponse): TypedCardsResponse {
        return {
            collectionId: Collections.Cards,
            collectionName: Collections.Cards,

            id: preview.id,
            title: preview.title,
            description: "Loading...", // don't show a truncated description while loading the full one
            priority: preview.priority,
            due_by: preview.due_by,
            duration_days: preview.duration_days,
            dependencies: preview.dependencies,
            
            created: preview.created,
            updated: preview.updated,
            moved_at: preview.moved_at,
            created_by: preview.created_by,
            assignment_data: preview.assignment_data,
            position: preview.position,

            board: preview.board,
            section: preview.section,
            subprojects: preview.subprojects.map(sp => sp.id),
            
            metadata: {},
            files: [],

            expand: {}
        };
    }

    const saveDebounce = 200;

    let tracker = $state<DirtyTracker<TypedCardsResponse, TypedCardPreviewResponse> | null>(null);
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    // Initialize or merge incoming `card` prop changes
    $effect(() => {
        let newSelected: TypedCardPreviewResponse | null = null;
        untrack(() => {
            if(card && selectingCard) {
                // Re-select the original card and run the callback
                const originalCard = boardCards.find((c) => c.id === selectingCard!.originalSelection);
                newSelected = card;
                if(originalCard) {
                    card = originalCard;
                }
            }
        });

        if(card == null) {
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
                tracker = new DirtyTracker<TypedCardsResponse, TypedCardPreviewResponse>(
                    $state.snapshot(card!),
                    {
                        transformExternal: (ext) => constructPartialFullCard($state.snapshot(ext)),
                        fetchFull: async (id) => {
                            return await queryOne(Collections.Cards, id) as TypedCardsResponse;
                        }
                    }
                );
            });
        } else {
            console.log("Card updated externally, merging changes");
            tracker.updateExternal($state.snapshot(card));
        }

        untrack(async () => {
            await tick();
            await tick();
            await tick();
            if(tracker && newSelected && selectingCard) {
                selectingCard.callback(newSelected, tracker.current);
                selectingCard = null;
            }
        });
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
            await save(Collections.Cards, {
                ...stripExpand(tracker.current),
                files: undefined // don't update files, since it's handled separately
            }, {
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

    const metadataItems = $derived(board ? getCardMetadataItems(board, {
        board: $state.snapshot(board) as TypedBoardsResponse,
        metadata: $state.snapshot(tracker ? tracker.current.metadata ?? null : null) as CardMetadata | null
    }, true) : []);
    const extraItems = $derived(getExtraMetadataItems(metadataItems, tracker ? tracker.current.metadata ?? null : null));
    
    let uploadQueue: { name: string, file: File }[] = [];

    async function updateCardFiles() {
        const card = tracker?.current;
        if(!card) return;

        // 1. check what files the metadata still contains
        let metadataFiles: string[] = [];
        if(card.metadata) {
            for(const metadataItem of Object.values(card.metadata)) {
                walkMetadataValues(metadataItem.type, metadataItem.value, (ty, val) => {
                    if(ty.base === "file") {
                        if(ty.multi) {
                            metadataFiles.push(...(val as MetadataFile[]).map(f => f.id));
                        } else if(val !== null) {
                            metadataFiles.push((val as MetadataFile).id);
                        }
                    }
                });
            }
        }

        // 2. remove files that are no longer referenced in the metadata from the card and the upload queue
        // Since Pocketbase adds random suffixes, we check if any of the metadata files are prefixes of each
        // file in the card's files array.
        let removedFiles = card.files.filter(f => !metadataFiles.some(mf => f.startsWith(mf)));

        // 3. construct an array of Files of new files to upload with the changed names
        let newFiles = uploadQueue
            .filter(f => !card.files.some(cf => cf.startsWith(f.name.split(".").slice(0, -1).join(".") as FileNameString)))
            .map(f => new File([f.file], f.name, { type: f.file.type, lastModified: f.file.lastModified }));
        uploadQueue = [];

        // 4. update the record with additions and removals
        if(newFiles.length === 0 && removedFiles.length === 0) {
            return;
        }
        
        console.log("Updating card files:", { newFiles, removedFiles });
        const newCard = await client.collection(Collections.Cards).update(card.id, {
            "files+": newFiles.length > 0 ? newFiles : undefined,
            "files-": removedFiles.length > 0 ? removedFiles : undefined
        }, {
            requestKey: null // don't cancel
        });

        card.files = newCard.files;
    }
    const updateCardFilesDebounced = debounce(updateCardFiles, 100);

    let uploadContext: UploadContext = {
        queueUpload(name: string, file: File) {
            uploadQueue.push({ name, file });
            updateCardFilesDebounced();
        },
        update() {
            updateCardFilesDebounced();
        }
    };
    setUploadContext(uploadContext);
</script>

{#if selectingCard}
    <div class="selecting-card-overlay">
        <div class="selecting-card-message">
            <p>{selectingCard.message}</p>
            <button class="cancel" onclick={() => {
                selectingCard = null;
            }}>Cancel</button>
        </div>
    </div>
{/if}

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
                    <span class="prop-label"><Kanban />Subprojects</span>
                    <div class="prop-value">
                        <InlineSelector
                            values={localCard.subprojects?.map(id => ({ id, name: subprojects.find(s => s.id === id)?.name ?? "Unknown Subproject" })) ?? []}
                            data={subprojects.map(s => ({ id: s.id, name: s.name ?? "Unknown subproject" }))}
                            onchange={(ids) => localCard.subprojects = ids}
                            itemName="subprojects"
                        />
                    </div>
                </div>
            {/if}

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

        <h3><Timer />Scheduling</h3>
        <div class="properties">
            <div class="property due-date">
                <span class="prop-label">
                    <Calendar />
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
            <div class="property">
                <span class="prop-label"><Clock /> Duration</span>
                <div class="prop-value duration">
                    <input type="number" min="0" bind:value={localCard.duration_days} placeholder="Duration in days" />
                    <span>days</span>
                </div>
            </div>
            <div class="property dependencies">
                <span class="prop-label"><ListTree /> Dependencies</span>
                <div class="prop-value">
                    <CardDependencySelector
                        bind:dependencies={localCard.dependencies}
                        {boardCards}
                        onopendependency={(id) => {
                            // Open the dependency card instead of the current card
                            card = boardCards.find((c) => c.id === id) ?? null;
                        }}
                        onselectcard={async (message, callback) => {
                            // close ourself and wait for a new card to be selected, then
                            // re-select this card and return it
                            const id = localCard.id;
                            card = null;
                            await tick();
                            selectingCard = {
                                message, callback,
                                originalSelection: id
                            };
                        }}
                    />
                </div>
            </div>
        </div>

        {#each metadataItems as { icon, title, fields }}
            <h3>
                <!-- svelte-ignore svelte_component_deprecated - this could be a v4 component -->
                {#if icon}<svelte:component this={icon} />{/if}
                {title}
            </h3>
            <CardFieldCategory {fields} bind:card={
                () => localCard,
                (v) => {
                    if(tracker) {
                        tracker.current = v;
                    }
                    updateCardFilesDebounced();
                }
            } />
        {/each}
        {#if extraItems.length > 0}
            <h3><FileQuestionMark /> Other</h3>
            <CardFieldCategory fields={extraItems} bind:card={
                () => localCard,
                (v) => {
                    if(tracker) {
                        tracker.current = v;
                    }
                    updateCardFilesDebounced();
                }
            } />
        {/if}
    </div>

    <hr />

    <CardViewFooter card={localCard} />    
{/if}
</ModalPanel>

<style lang="scss">
@use "props.scss";

.selecting-card-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    margin: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;

    .selecting-card-message {
        background-color: var(--bg-primary);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        text-align: center;

        display: flex;
        align-items: center;
        gap: 0.5rem;
    }    
}

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

    padding-bottom: 3rem;
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

.assignment {
    grid-column: span 2;
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

.duration {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 0
    
    span {
        color: var(--text-tertiary);
    }
}

.dependencies {
    grid-column: 1 / -1;
}

hr {
    margin: 0 0 1rem 0;
}
</style>