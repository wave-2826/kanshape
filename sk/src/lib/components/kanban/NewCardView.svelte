<script lang="ts">
    import type { TypedCardsCreate } from "$lib/data/cards";
    import { save, type ExpandResponse } from "$lib/pocketbase";
    import { authModel } from "$lib/pocketbase/auth";
    import { Collections, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { Plus } from "lucide-svelte";
    import CardView from "./cardView/CardView.svelte";
    import { CREATE_SYMBOL, transformMetadata, walkMetadata, walkMetadataValues, type MetadataFile, type MetadataValue, type TypedBoardsResponse } from "$lib/data/project";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import type { Snippet } from "svelte";
    import { setUploadContext, type UploadContext } from "./cardView/fieldEditor/uploadContext";
    import type { TypedPartsResponse } from "$lib/data/parts";
    import type { CreationPart } from "../parts/partData";

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
        board: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
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

    const sections = $derived(board.expand.sections ?? []);

    async function create() {
        if(cardData.title.length === 0) return;

        // transform creation metadata
        if(cardData.metadata) for(const [k, v] of Object.entries(cardData.metadata)) {
            function indexFile(f: MetadataValue): MetadataFile {
                const file = f as MetadataFile;
                if(file.id === CREATE_SYMBOL) return {
                    id: "",
                    name: file.name
                };
                return file;
            }

            const { value, type } = transformMetadata(v.type, v.value, n => {
                if(n.type.base === CREATE_SYMBOL) {
                    if(n.type.create === "onshape_part") {
                        return {
                            type: { base: "onshape_part" },
                            value: "asdftodoidhere"
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
            metadataFiles.add(f.name);
        };
        walkMetadata(cardData, (ty, val) => {
            if(ty.base === "file") {
                if(Array.isArray(val)) for(const f of val) indexFile(f);
                else indexFile(val);
            }
        });
        const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, "");
        cardData.files = cardData.files.filter(f => metadataFiles.has(stripExtension(f.name)));

        await save(Collections.Cards, cardData, { create: true }).catch((err) => {
            console.error("Failed to create card:", err);
            return null;
        });

        oncreate();
    }

    function getDefaultCardData(): TypedCardsCreate {
        return {
            assignment_data: null,
            board: board.id,
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
        update() {}
    });
    $effect(() => {
        if(board.type === "parts") {
            uploadContext.partExport = {
                async getParts() {
                    let parts: (TypedPartsResponse | CreationPart)[] = [];
                    walkMetadata(cardData, (ty, val) => {
                        if(ty.base === CREATE_SYMBOL && ty.create === "onshape_part") {
                            if(Array.isArray(val)) parts.push(...val as CreationPart[]);
                            else parts.push(val as CreationPart);
                        }
                    });
                    return parts;
                },
                queuePartExport(name, partRecord, type) {
                    // TODO
                    alert("Part export not implemented yet");
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
    <button type="submit" disabled={cardData.title.length === 0} onclick={create}><Plus /> Create</button>
</div>

<style lang="scss">
.content {
    overflow-y: auto;
}
.buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}
</style>