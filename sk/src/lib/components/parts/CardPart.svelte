<script lang="ts">
    import type { TypedPartsResponse } from "$lib/data/parts";
    import { appearanceToHex, type PartHeuristicsResult } from "$lib/onshape/partHeuristics";
    import { Box, Sparkles } from "lucide-svelte";
    import PopoverButton from "../PopoverButton.svelte";
    import CardPartModal from "./CardPartModal.svelte";
    import PartPreviewRenderer from "./PartPreviewRenderer.svelte";
    import { contrastStyle } from "$lib/actions";
    import { opaqueHex } from "$lib/color";
    import { getLayoutParams } from "../../../routes/(authed)/+layout.svelte";
    import type { CreationPart } from "./partData";
    import { formatDistance } from "$lib/util";

    const { part }: {
        part: TypedPartsResponse | CreationPart;
    } = $props();

    const layoutParams = getLayoutParams();

    let modal: CardPartModal | null = $state(null);

    const partData = $derived("id" in part ? part.part_data : part.partData);
    const partId = $derived("id" in part ? part.part_id : part.partId);
</script>

{#if "id" in part}
    <CardPartModal {part} bind:this={modal} />
{/if}

<!-- svelte-ignore a11y_no_noninteractive_tabindex - it doesn't -->
<div
    class="part"
    class:button={"id" in part}
    onclick={(e) => {
        if(e.target instanceof HTMLElement && e.target.closest("[data-part-preview]")) return;
        modal?.open();
    }}
    onkeydown={(e) => {
        if(e.key === "Enter" || e.key === " ") modal?.open();
    }}
    role={"id" in part ? "button" : "presentation"}
    tabindex={"id" in part ? 0 : undefined}
>
    <span class="part-type">{part.type === "part" ? "Part" : "Assembly"}</span>
    <div class="preview" data-part-preview>
        {#if "id" in part}
            <!-- holy fetch waterfall -->
            <PartPreviewRenderer {part} edges={false} />
        {:else}
            <div class="placeholder" title="Preview will generate after creation">
                <Box class={$css("placeholder-icon")} />
            </div>
        {/if}
    </div>
    <span class="part-name" title={partData?.name ?? "Unknown"}>
        {partData?.name ?? "Unknown"}
    </span>
    <span class="part-number" title={partData?.part_number ?? "Unknown"}>
        {partData?.part_number ?? ""}
    </span>
    {#if part.type === "part"}
        {@const data = partData as PartHeuristicsResult}
        {@const hasType = data.heuristic.partType !== "unknown"}
        <PopoverButton
            class={[$css("heuristic-button"), hasType ? $css("autodetected") : ""]}
            contentClass={$css("heuristic-result")}
        >
            {#snippet content()}
                <p>
                    {#if hasType}
                        Detected this part as a
                        <span class="length">{formatDistance(data.heuristic.thickness)}</span>
                        <span class="part-type">{data.heuristic.partType}</span>.
                    {:else}
                        No part type could be detected.
                    {/if}
                </p>
                <dl>
                    {#if hasType}
                        <dt>Confidence:</dt>
                        <dd>{Math.round((data.heuristic.confidence - 0.9) * 1000)}%</dd>
                        <dt>Size:</dt>
                        <dd>{formatDistance(data.heuristic.size[0])} x {formatDistance(data.heuristic.size[1])}</dd>
                        <dt>{data.heuristic.partType === "plate" ? "Thickness" : "Length"}:</dt>
                        <dd>{formatDistance(data.heuristic.thickness)}</dd>
                        <hr />
                    {/if}
                    {#if data.name}
                        <dt>Name:</dt>
                        <dd>{data.name}</dd>
                    {/if}
                    <dt>Part number:</dt>
                    <dd>{data.part_number ?? "None"}</dd>
                    {#if data.description}
                        <dt>Description:</dt>
                        <dd>{data.description}</dd>
                    {/if}
                    {#if data.revision}
                        <dt>Revision:</dt>
                        <dd>{data.revision}</dd>
                    {/if}
                    {#if data.appearance}
                        {@const color = appearanceToHex(data.appearance)}
                        <dt>Color:</dt>
                        <dd class="appearance">
                            <div
                                class="color-preview"
                                style="color: {opaqueHex(color)}"
                                use:contrastStyle={"border: 1px solid var(--border)"}
                            ></div> {color}
                        </dd>
                    {/if}
                    <dt>Material:</dt>
                    <dd>
                        {#if data.material}
                            {
                                data.material.density ? `${data.material.density} kg/m³` : "unknown density"
                            }{
                                data.material.name ? ` ${data.material.name}` : "- unknown material"
                            }
                        {:else}
                            None
                        {/if}
                    </dd>
                </dl>
            {/snippet}
            {#if layoutParams.isMobile}
                {#if hasType}
                    <Sparkles />
                    {data.heuristic.partType.charAt(0).toUpperCase() + data.heuristic.partType.slice(1)}
                {:else}
                    Unknown
                {/if}
            {:else}
                {#if hasType}<Sparkles /> Detected {data.heuristic.partType}
                {:else}No part detected{/if}
            {/if}
        </PopoverButton>
    {/if}
    <span class="part-id">{partId}</span>
</div>

<style lang="scss">
.part {
    flex-shrink: 0;

    display: grid;
    grid-template-rows: 1.25rem 1rem 1rem 0.25rem; // ""padding""
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
        "preview type result"
        "preview name result"
        "preview number id"
        "preview . .";
    gap: 0.25rem 0.5rem;
    position: relative;

    text-align: left;
    
    background-color: var(--bg-secondary);
    border-radius: 4px;
    flex: 1;
    overflow: hidden;
    padding: 0 0.5rem 0 0;
    
    .preview {
        grid-area: preview;
        height: 100%;
        aspect-ratio: 1 / 1;
    }
    .placeholder {
        display: grid;
        place-items: center;
        height: 100%;

        .placeholder-icon {
            width: 2rem;
            height: 2rem;
            color: var(--text-tertiary);
        }
    }

    .part-type {
        grid-area: type;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);
        align-self: end;
    }
    .part-name {
        grid-area: name;
        font-weight: bold;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    .part-number {
        grid-area: number;
        font-size: var(--font-small);
        color: var(--text-secondary);
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    .part-id {
        grid-area: id;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);
        text-align: right;
        margin-right: 0.25rem;
    }

    .heuristic-button {
        grid-area: result;
        --bg-color: var(--bg-primary);
        align-self: start;
        margin-top: 0.5rem;

        font-size: var(--font-small);

        &.autodetected {
            color: var(--success);
        }
    }
}

.heuristic-result {
    font-size: var(--font-small);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    .length {
        color: var(--accent);
    }
    .part-type {
        font-weight: bold;
    }

    dl {
        margin: 0;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.25rem 0.75rem;

        dt {
            color: var(--text-secondary);
        }
        dd {
            margin: 0;
            max-width: 30ch;
        }

        hr {
            grid-column: 1 / -1;
            border: none;
            border-top: 1px solid var(--border);
            margin: 0.25rem 0;
        }

        .appearance {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            justify-self: start;
            border-radius: 4px;

            .color-preview {
                display: inline-block;
                width: 1em;
                height: 1em;
                border-radius: 4px;
                background-color: currentColor;
            }
        }
    }
}
</style>