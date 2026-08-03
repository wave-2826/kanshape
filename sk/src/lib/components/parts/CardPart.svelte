<script lang="ts">
    import type { PartData, TypedPartsResponse } from "$lib/data/parts";
    import { appearanceToHex } from "$lib/onshape/partHeuristics";
    import { Box, Boxes, Cuboid, Cylinder, Diamond, Sparkles, X } from "@lucide/svelte";
    import PopoverButton from "../PopoverButton.svelte";
    import CardPartModal from "./CardPartModal.svelte";
    import PartPreviewRenderer from "./PartPreviewRenderer.svelte";
    import { contrastStyle } from "$lib/actions";
    import { opaqueHex } from "$lib/color";
    import { getLayoutParams } from "../../../routes/(authed)/+layout.svelte";
    import type { CreationPart } from "./partData";
    import { formatDistance } from "$lib/util";

    let { part = $bindable() }: {
        part: TypedPartsResponse | CreationPart;
    } = $props();

    const layoutParams = getLayoutParams();

    let modal: CardPartModal | null = $state(null);

    const partData = $derived("part_id" in part ? part.part_data : part.partData);
    const partId = $derived("part_id" in part ? part.part_id : "");

    function setOverride(override: PartData["override"]) {
        if("part_id" in part && part.part_data) {
            part = {
                ...part,
                part_data: {
                    ...part.part_data,
                    override
                }
            };
        } else if("partData" in part && part.partData) {
            part = {
                ...part,
                partData: {
                    ...part.partData,
                    override
                }
            };
        }
    }
</script>

{#if "part_id" in part}
    <CardPartModal {part} bind:this={modal} />
{/if}

<!-- svelte-ignore a11y_no_noninteractive_tabindex - it doesn't -->
<div
    class="part"
    class:button={"part_id" in part}
    onclick={(e) => {
        if(e.target instanceof HTMLElement && e.target.closest("[data-part-preview]")) return;
        modal?.open();
    }}
    onkeydown={(e) => {
        if(e.key === "Enter" || e.key === " ") modal?.open();
    }}
    role={"part_id" in part ? "button" : "presentation"}
    tabindex={"part_id" in part ? 0 : undefined}
>
    <span class="part-type">{part.type === "part" ? "Part" : "Assembly"}</span>
    <div class="preview" data-part-preview>
        {#if "part_id" in part}
            <!-- holy fetch waterfall -->
            <PartPreviewRenderer {part} edges={false} />
        {:else}
            <div class="placeholder" title="Preview will generate after creation">
                {#if part.type === "assembly"}<Boxes class={$css("placeholder-icon")} />
                {:else}<Box class={$css("placeholder-icon")} />{/if}
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
        {@const data = partData as PartData}
        {@const partType = data.override?.partType ?? data.heuristic.partType}
        {@const hasType = partType !== "unknown"}

        {#snippet typeIcon(ty: PartData["heuristic"]["partType"])}
            {#if ty === "plate"}<Diamond />
            {:else if ty === "shaft"}<Cylinder />
            {:else if ty === "tube"}<Cuboid />
            {:else}<Box />{/if}
        {/snippet}

        <PopoverButton
            class={[$css("heuristic-button"), hasType ? $css("autodetected") : ""]}
            contentClass={$css("heuristic-result")}
        >
            {#snippet content()}
                <p>
                    {#if hasType}
                        {data.override ? "Set as a" : "Detected this part as a"}
                        <span class="length">{formatDistance(data.heuristic.thickness)}</span>
                        <span class="part-type">{partType}</span>.
                    {:else}
                        {data.override ? "No part type set." : "No part type could be detected."}
                    {/if}
                </p>
                <div class="actions">
                    <div class="horizontal">
                        <button class="unset" class:active={data.override?.partType === "unknown"} onclick={() => {
                            setOverride({ partType: "unknown" });
                        }} title="Set to no part configured">
                            <X />
                        </button>
                        <button class:active={!data.override} onclick={() => {
                            setOverride(undefined);
                        }} title="Use detected part ({data.heuristic.partType})">
                            <Sparkles />
                            Detected ({data.heuristic.partType})
                        </button>
                    </div>
                    <div class="multi-button">
                        {#snippet option(type: PartData["heuristic"]["partType"])}
                            <button
                                class:active={data.override?.partType === type}
                                onclick={() => setOverride({ partType: type })}
                                title="Set this part as a {type} (overrides detection)
Doesn't make a huge difference right now! Just visual."
                            >{@render typeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}</button>
                        {/snippet}
                        {@render option("plate")}
                        {@render option("shaft")}
                        {@render option("tube")}
                    </div>
                </div>
                <dl>
                    {#if hasType}
                        <dt>Confidence:</dt>
                        <dd>{Math.round(data.heuristic.confidence * 100)}%</dd>
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

            {#if data.override}{@render typeIcon(partType)} {partType.charAt(0).toUpperCase() + partType.slice(1)}
            {:else if hasType}<Sparkles /> {layoutParams.isMobile ? partType.charAt(0).toUpperCase() + partType.slice(1) : `Detected ${partType}`}
            {:else}No part detected{/if}
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
        justify-self: end;
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

    .actions {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        .horizontal {
            display: flex;
            gap: 0.25rem;
            align-items: center;
        }
        .unset {
            flex: 0;
            padding: 0.25rem;
        }
        button.active {
            --bg-color: var(--bg-selection);
        }
        .multi-button {
            --bg-color: var(--bg-secondary);
            --selection-color: var(--bg-selection);
        }
    }
}
</style>