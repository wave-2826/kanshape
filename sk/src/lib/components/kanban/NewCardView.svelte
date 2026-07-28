<script lang="ts">
    import type { TypedCardsCreate } from "$lib/data/cards";
    import { client, save, type ExpandResponse } from "$lib/pocketbase";
    import { authModel } from "$lib/pocketbase/auth";
    import { Collections, type PartsResponse, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { Plus } from "lucide-svelte";
    import CardView from "./cardView/CardView.svelte";
    import { CREATE_SYMBOL, transformMetadata, walkMetadata, type CreationExportPartTarget, type MetadataFile, type MetadataValue, type TypedBoardsResponse } from "$lib/data/project";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import type { Snippet } from "svelte";
    import { setUploadContext, type UploadContext } from "./cardView/fieldEditor/uploadContext";
    import type { PartExport, TypedPartsResponse } from "$lib/data/parts";
    import type { CreationPart } from "../parts/partData";
    import { queryExistingParts, generatePartPreview, updatePartRecord } from "../parts/CardPartEditor.svelte";
    import { generateRecordID } from "$lib/onshape/client";

    const {
        board,
        subprojects,
        disabled,
        buttonsClass,
        contentClass,
        
        boardCards,
        onopen,
        oncreate,

        buttons,
        header
    }: {
        board?: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        subprojects: SubprojectsRecord[],
        boardCards?: TypedCardPreviewResponse[],
        disabled?: boolean,
        buttonsClass?: string,
        contentClass?: string,

        onopen: (data: TypedCardsCreate) => TypedCardsCreate,
        oncreate: () => void,

        buttons?: Snippet,
        header?: Snippet
    } = $props();

    const sections = $derived(board?.expand.sections ?? []);

    async function create() {
        if(cardData.title.length === 0) return;
        if(!board) return;

        // exports can be slow, so we run them after card creation
        let exports: (Omit<PartExport, "partRecordId"> & { forPart: CreationExportPartTarget })[] = [];
        // parts are created after the card since they require the card id and we'd prefer not to make two requests
        let parts: { part: CreationPart, existingOrNewId: PartsResponse[] | string }[] = [];

        // transform creation metadata
        if(cardData.metadata) for(const [k, v] of Object.entries(cardData.metadata)) {
            function indexFile(f: MetadataValue): MetadataFile {
                const file = f as MetadataFile;
                if(file.id === CREATE_SYMBOL) {
                    switch(file.createType) {
                        case "auto_export":
                        case "export":
                            const id = crypto.randomUUID().replace(/-/g, "");
                            exports.push({ type: file.exportType, forPart: file.forPart, id });
                            return {
                                id,
                                name: file.name,
                                type: file.createType
                            };
                        default:
                            const _exhaustiveCheck: never = file.createType;
                            console.error("Unknown creation type:", _exhaustiveCheck);
                    }
                }
                return file;
            }

            const { value, type } = await transformMetadata(v.type, v.value, async (n) => {
                if(n.type.base === CREATE_SYMBOL) {
                    if(n.type.create === "onshape_part") {
                        const part = n.value as CreationPart;
                        const existing: PartsResponse[] | null = await queryExistingParts(part.sel);
                        
                        // If already adding this part, don't add multiple times
                        const existingAddedPart = parts.find(p =>
                            p.part.sel.documentId === part.sel.documentId &&
                            p.part.sel.elementId === part.sel.elementId &&
                            p.part.sel.partId === part.sel.partId
                        );
                        if(existingAddedPart) {
                            const eid = existingAddedPart.existingOrNewId;
                            return {
                                type: { base: "onshape_part" },
                                value: Array.isArray(eid) ? eid[0].id : eid
                            };
                        }
                        

                        const newId = existing && existing.length > 0 ? existing[0].id : generateRecordID();
                        parts.push({ part, existingOrNewId: existing && existing.length > 0 ? existing : newId })

                        return {
                            type: { base: "onshape_part" },
                            value: newId
                        };
                    }
                    else throw new Error(`Unknown creation type: ${n.type.create}`);
                } else if(n.type.base === "file") {
                    return {
                        type: n.type,
                        value: Array.isArray(n.value) ? n.value.map(indexFile) : indexFile(n.value)
                    }
                }
                return n;
            });
            cardData.metadata[k] = { type, value };
        }

        // only keep files that are in the metadata
        const metadataFiles = new Set<string>(); // set of used ids
        const indexFile = (file: MetadataValue) => {
            const f = file as MetadataFile;
            if(typeof f.id !== "string") return;
            metadataFiles.add(f.id);
        };
        walkMetadata(cardData, (ty, val) => {
            if(ty.base === "file") {
                if(Array.isArray(val)) for(const f of val) indexFile(f);
                else indexFile(val);
            }
        });
        const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, "");
        cardData.files = cardData.files.filter(f => metadataFiles.has(stripExtension(f.name)));

        const record = await save(Collections.Cards, cardData, { create: true }).catch((err) => {
            console.error("Failed to create card:", err);
            return null;
        });

        if(!record) {
            console.error("Failed to create card, no record returned");
            alert("Failed to create card");
            return;
        }

        // create parts
        for(const p of parts) {
            const partRecord = await updatePartRecord(p.existingOrNewId, p.part.sel, p.part.partData, record.id);
            if(!partRecord) {
                console.error("Failed to create part:", p.part);
                alert("Failed to create part");
                return;
            }

            // regenerate the preview
            generatePartPreview(partRecord.id);
        }

        // map exports to actual part records
        exports = exports.map(e => {
            const forPart = e.forPart;
            if("record" in forPart) {
                return {
                    ...e,
                    partRecordId: forPart.record
                };
            } else if("internalId" in forPart) {
                const part = parts.find(p => p.part.internalId === forPart.internalId);
                if(!part) throw new Error("No part found for export with internalId: " + forPart.internalId);
                
                const partRecordId = typeof part.existingOrNewId === "string" ? part.existingOrNewId : part.existingOrNewId[0].id;
                return {
                    ...e,
                    partRecordId,
                    cardId: record.id
                };
            } else {
                throw new Error("Unknown forPart type");
            }
        }) satisfies PartExport[];

        // begin exports
        client.send("/api/parts/export_all", {
            method: "POST",
            body: { exports }
        });

        oncreate();
    }

    function getDefaultCardData(): TypedCardsCreate {
        return {
            assignment_data: null,
            board: board?.id ?? "",
            created_by: $authModel?.id ?? "",
            dependencies: [],
            description: "",
            due_by: "",
            duration_days: 0,
            files: [],
            metadata: null,
            position: 0,
            priority: "low",
            section: sections[0]?.id,
            subprojects: [],
            title: "New card"
        };
    }
    
    // svelte-ignore state_referenced_locally
    let cardData = $state<TypedCardsCreate>(onopen(getDefaultCardData()));
    export function updateCard(cb: (data: TypedCardsCreate) => void) {
        cb(cardData);
    }

    let uploadContext: UploadContext = $state({
        queueUpload(name: string, file: File) {
            const namedFile = new File([file], name, { type: file.type, lastModified: file.lastModified });
            cardData.files!.push(namedFile);
        },
        update() {},
        hasFile(file: MetadataFile) {
            return cardData.files?.some(f => f.name.startsWith(String(file.id))) ?? false;
        }
    });
    $effect(() => {
        if(!board) return;
        if(board.type === "parts") {
            uploadContext.partExport = {
                cardId: null,
                async getParts() {
                    let parts: (TypedPartsResponse | CreationPart)[] = [];
                    walkMetadata(cardData, (ty, val) => {
                        if(ty.base === CREATE_SYMBOL && ty.create === "onshape_part") {
                            if(Array.isArray(val)) parts.push(...val as CreationPart[]);
                            else parts.push(val as CreationPart);
                        }
                    });
                    // deduplicate by id
                    return [...new Map(parts.map(p => ["id" in p ? p.id : null, p])).values()];
                },
                hasParts() {
                    let hasParts = false;
                    walkMetadata(cardData, (ty, val) => {
                        if(ty.base === CREATE_SYMBOL && ty.create === "onshape_part") {
                            hasParts = true;
                        }
                    });
                    return hasParts;
                }
            };
        } else {
            uploadContext.partExport = undefined;
        }
    });
    setUploadContext(uploadContext);
</script>

<div class={["content", contentClass]}>
    {@render header?.()}
    <CardView
        {board}
        {subprojects}
        {boardCards}
        {disabled}
        bind:card={cardData}
        autofocusTitle

        allowSelectingDependencies={false}
    />
</div>
<div class={["buttons", buttonsClass]}>
    {@render buttons?.()}
    <button type="submit" disabled={cardData.title.length === 0 || !board} onclick={create}><Plus /> Create</button>
</div>

<style lang="scss">
.content {
    overflow-y: auto;
    flex: 1;
}
.buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}
</style>