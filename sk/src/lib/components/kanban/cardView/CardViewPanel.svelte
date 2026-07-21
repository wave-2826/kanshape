<script lang="ts">
    import { client, save, stripExpand, watchOne, type ExpandResponse } from "$lib/pocketbase";
    import { Collections, type FileNameString, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import ModalPanel from "$lib/components/ModalPanel.svelte";
    import { walkMetadataValues, type MetadataFile, type TypedBoardsResponse } from "$lib/data/project";
    import { deasyncify, debounce, deepEqual } from "$lib/util";
    import CardView from "./CardView.svelte";
    import { readable, type Readable } from "svelte/store";
    import { applyDiff, createDiff } from "./diff";
    import CardViewFooter from "./CardViewFooter.svelte";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import type { TypedCardsResponse } from "$lib/data/cards";
    import { setUploadContext, type CardSelectState, type UploadContext } from "./fieldEditor/uploadContext";
    import { untrack } from "svelte";
    
    let {
        board,
        boardCards,
        card: cardId = $bindable(),
        subprojects
    }: {
        board: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        boardCards: TypedCardPreviewResponse[],
        card: string | null,
        subprojects: SubprojectsRecord[]
    } = $props();

    /**
     * This panel shows a full card, but the card we get is a preview (with limited fields so we
     * don't send unnecessary data for the full board). This constructs a partial full card from
     * the preview data to use as a preview while the full data is loading.
     */
    function previewPlaceholder(preview: TypedCardPreviewResponse): TypedCardsResponse {
        // this doesn't actually need to be reactive (it can never change while loading), but
        // it is to avoid reactivity warnings
        const v = $state({
            collectionId: Collections.Cards,
            collectionName: Collections.Cards,

            id: preview.id,
            title: preview.title,
            description: "Loading...",
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
        });
        return v;
    }

    let selectingCard = $state<CardSelectState | null>(null);

    // the card on the server currently. doesn't include any local changes.
    let serverCard = $state<TypedCardsResponse | null>(null);
    $effect(() => {
        if(untrack(() => selectingCard !== null)) {
            untrack(() => {
                if(cardId) {
                    if(card?.id !== selectingCard?.originalSelection) {
                        console.warn("Card changed while selecting a dependency; cancelling selection");
                        selectingCard = null;
                        cardId = null;
                        return;
                    }
    
                    const selected = boardCards.find(c => c.id === cardId);
                    // card should still be correct right now
                    if(selected && card) {
                        selectingCard!.callback(selected, card);
                    }
                    cardId = selectingCard!.originalSelection;
                    selectingCard = null;
                } else {
                    selectingCard = null;
                }
            });
        }

        if(cardId) {
            const store = deasyncify(
                (watchOne(Collections.Cards, cardId, {
                    requestKey: null
                }) as Promise<Readable<TypedCardsResponse | null>>)
                .catch((e) => {
                    console.error(e);
                    return readable(null);
                })
            );
            const unsub = store.subscribe((v) => {
                serverCard = v;
            });
            return () => unsub();
        } else {
            serverCard = null;
        }
    });
    
    // a snapshot of the last server card value for diffing; doesn't need to be reactive
    let lastServerCard: TypedCardsResponse | null = null;
    // the local card, or null if we haven't loaded yet the server card.
    let card = $state<TypedCardsResponse | null>(null);
    
    // update the local card based on server card changes
    $effect(() => {
        if(!serverCard) return;

        const diff = createDiff(
            lastServerCard,
            $state.snapshot(serverCard as any) // tsc errors without as any ???
        );
        lastServerCard = $state.snapshot(serverCard as any);
        card = applyDiff(diff, untrack(() => $state.snapshot(card)));
    });

    const preview = $derived(boardCards.find(c => c.id === cardId));

    function performSave() {
        if(!card) return;

        save(Collections.Cards, {
            ...stripExpand($state.snapshot(card)),
            files: undefined // don't update files, since it's handled separately
        }, {
            create: false,
            expand: ""
        });
        lastServerCard = $state.snapshot(card as any);
    }
    let saveDebounced = debounce(performSave, 250, true);

    $effect(() => {
        if(!deepEqual(
            $state.snapshot(card),
            untrack(() => $state.snapshot(serverCard))
        )) {
            saveDebounced();
        }
    });

    let uploadQueue: { name: string, file: File }[] = [];
    async function updateCardFiles() {
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

        // 3. construct an array of Files to upload with the changed names
        let newFiles = uploadQueue
            .filter(f => !card!.files.some(cf => cf.startsWith(f.name.split(".").slice(0, -1).join(".") as FileNameString)))
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
        },
        getFileUrl(file) {
            if(!card) return "";
            // Files are given random suffixes by pocketbase, so we just find the file
            // in the card's files array. could be a little cleaner, but whatever.
            const foundFile = card.files.find(f => f.startsWith(file.id)) ?? file.id;
            const url = new URL(client.files.getURL(card, foundFile));
            url.searchParams.set("download", "1");
            return url.toString();
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

<ModalPanel open={cardId !== null} onclose={() => cardId = null} collapse={selectingCard !== null}>
    {#if preview}
        {@const _card = card ?? previewPlaceholder(preview)}
        <CardView
            {board}
            disabled={card === null}
            bind:card={
                () => _card,
                (v) => {
                    if(card === null) {
                        console.warn("Tried to update card view while it was loading");
                        return;
                    }
                    card = v;
                }
            }
            allowSelectingDependencies={true}
            onopendependency={(id) => cardId = id}
            onselectdependency={(state) => {
                if(!card) return;
                selectingCard = state;
            }}
            {boardCards}
            {subprojects}
        />
        <hr />
        <CardViewFooter card={_card} />
    {:else}
        <p>Error displaying card: unknown preview</p>
    {/if}
</ModalPanel>

<style lang="scss">

.selecting-card-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    margin: 1rem;
    pointer-events: none;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;

    .selecting-card-message {
        background-color: var(--bg-secondary);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        text-align: center;
        pointer-events: all;

        display: flex;
        align-items: center;
        gap: 0.5rem;

        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);

        button {
            --bg-color: var(--bg-primary);
        }
    }    
}

hr {
    margin: 0 0 1rem 0;
}
</style>