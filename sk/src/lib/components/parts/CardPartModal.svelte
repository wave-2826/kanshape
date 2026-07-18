<script lang="ts">
    import { ArrowRight, ExternalLink, X } from "lucide-svelte";
    import Modal from "../Modal.svelte";
    import Portal from "../Portal.svelte";
    import PartPreviewRenderer from "./PartPreviewRenderer.svelte";
    import type { TypedPartsResponse } from "$lib/data/parts";
    import { getConfig } from "$lib/config";
    import { getOnshapeContext } from "../nav/onshapeContext.svelte";

    let expandedModal: Modal;
    let modelInfo = $state<{ size: number, generated: string }>();

    const {
        part
    }: {
        part: TypedPartsResponse;
    } = $props();

    const config = getConfig();
    const onshapeCtx = getOnshapeContext();

    function openModal() {
        expandedModal?.open();
    }
    export { openModal as open };
</script>

<Portal target="[data-modal-target]">
    <div class="modal-preview">
        <Modal bind:this={expandedModal} id="part-preview-modal-{part?.id ?? ""}">
            {@const canOpenInTab = onshapeCtx.onOnshape && onshapeCtx.documentId === part.document_id}
            <PartPreviewRenderer {part} onload={(info) => modelInfo = info} />
            <div class="part-info">
                <span class="name">{part.part_data?.name ?? "Unknown"}</span>
                <span class="number">{part.part_data?.part_number ?? ""}</span>
            </div>
            <button class="open" onclick={() => {
                if(!part) return;
                if(canOpenInTab) {
                    onshapeCtx.client?.openAnotherElementInCurrentWorkspace(part.element_id);
                } else {
                    open(`${config.onshape.baseDomain}/documents/${part.document_id}/${part.wvm}/${part.wvm_id}/e/${part.element_id}`, "_blank");
                }
            }}>
                <!-- TODO: we can store this ourselves -->
                <img src="https://www.google.com/s2/favicons?domain=onshape.com&sz=32" alt="Onshape" width="16" height="16" />
                {#if canOpenInTab}
                    Open tab <ArrowRight />
                {:else}
                    Open in Part Studio <ExternalLink />
                {/if}
            </button>
            <button class="close" onclick={() => expandedModal?.close()}><X /></button>
            {#if modelInfo}
                <div class="model-info">
                    <span class="size">{(modelInfo.size / 1024).toFixed(2)}kb</span>
                    {#if modelInfo.generated}
                        <span class="generated">Generated {new Date(modelInfo.generated).toLocaleDateString()}</span>
                    {/if}
                </div>
            {/if}
        </Modal>
    </div>
</Portal>

<style lang="scss">

.modal-preview {
    display: content;

    :global(dialog) {
        width: min(calc(100% - 4rem), 800px);
        height: min(calc(100% - 4rem), 600px);
        padding: 0;
        position: relative;
    }

    .part-info {
        position: absolute;
        top: 1rem;
        left: 1rem;
        text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .name {
            font-size: var(--font-large);
            font-weight: bold;
            color: var(--text-primary);
        }
        .number {
            font-size: var(--font-small);
            color: var(--text-secondary);
        }
    }

    .close {
        --bg-color: transparent;
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.5rem;
    }

    .open {
        --bg-color: var(--bg-secondary);
        position: absolute;
        bottom: 0.5rem;
        left: 0.5rem;
        font-size: var(--font-medium);

        :global(svg) {
            width: 1em;
            height: 1em;
        }
    }

    .model-info {
        position: absolute;
        bottom: 0.5rem;
        right: 0.5rem;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);
        display: flex;
        flex-direction: column;
        text-align: right;
    }
}
</style>