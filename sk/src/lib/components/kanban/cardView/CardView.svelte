<script lang="ts">
    import { autofocus, autoSize } from "$lib/actions";
    import { getPriorityColor, priorities, type CardAssignmentData, type TypedCardsCreate, type TypedCardsResponse } from "$lib/data/cards";
    import type { SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { Calendar, ChartColumnBig, Clock, FileQuestionMark, Flag, Kanban, ListTree, SquareKanban, Timer, Trash, Users } from "lucide-svelte";
    import CardAssignmentValue from "./CardAssignmentValue.svelte";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import InlineSelector from "$lib/components/InlineSelector.svelte";
    import { localToZoned, tomorrowDate, zonedToLocal } from "$lib/datetime";
    import CardDependencySelector from "./CardDependencySelector.svelte";
    import { type TypedBoardsResponse } from "$lib/data/project";
    import type { ExpandResponse } from "$lib/pocketbase";
    import CardFieldCategory from "./fieldEditor/CardFieldCategory.svelte";
    import type { CardSelectState } from "./fieldEditor/uploadContext";
    import { getCardMetadataItems, getExtraMetadataItems } from "$lib/data/metadata";

    let {
        board,
        card = $bindable(),
        subprojects,
        disabled = false,

        boardCards,
        onopendependency,
        onselectdependency,
        allowSelectingDependencies,

        autofocusTitle = false
    }: {
        board?: TypedBoardsResponse & ExpandResponse<"boards", "sections">,
        card: TypedCardsResponse | TypedCardsCreate,
        subprojects: SubprojectsRecord[],
        disabled?: boolean,

        boardCards?: TypedCardPreviewResponse[],
        onopendependency?: (id: string | null) => void,
        onselectdependency?: (state: CardSelectState) => void,
        allowSelectingDependencies: boolean,

        autofocusTitle?: boolean
    } = $props();

    const sections = $derived(board?.expand.sections ?? []);

    const metadataItems = $derived(board ? getCardMetadataItems(board) : null);
    const extraItems = $derived(metadataItems ? getExtraMetadataItems(metadataItems, card.metadata) : null);
</script>

<header>
    <input
        type="text"
        bind:value={card.title}
        class="title"
        placeholder="Card title"
        disabled={disabled}
        use:autofocus={autofocusTitle}
    />
</header>

<div class="card-content">
    <div class="field-group">
        <!-- Screenreader only -->
        <label for="description" aria-hidden="false" style="display: none;">Description</label>
        <textarea
            id="description"
            class="description"
            bind:value={card.description}
            placeholder="Add a more detailed description..."
            use:autoSize={card.description}
            disabled={disabled}
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
                    bind:value={card.section}
                    style="color: {sections.find(s => s.id === card.section)?.color ?? 'inherit'}"
                    disabled={disabled}
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
                    bind:value={card.priority}
                    style="color: {getPriorityColor(card.priority)}"
                    disabled={disabled}
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
                        values={card.subprojects?.map(id => ({ id, name: subprojects.find(s => s.id === id)?.name ?? "Unknown Subproject" })) ?? []}
                        data={subprojects.map(s => ({ id: s.id, name: s.name ?? "Unknown subproject" }))}
                        onchange={(ids) => card.subprojects = ids}
                        itemName="subprojects"
                    />
                </div>
            </div>
        {/if}

        <div class="property assignment">
            <span class="prop-label">
                <Users />
                Assignment
                {#if card.assignment_data}
                    <button class="clear" onclick={() => card.assignment_data = null} title="Clear assignment">
                        <Trash />
                    </button>
                {/if}
            </span>
            <CardAssignmentValue bind:assignmentData={card.assignment_data as CardAssignmentData} />
        </div>
    </div>

    <h3><Timer />Scheduling</h3>
    <div class="properties">
        <div class="property due-date">
            <span class="prop-label">
                <Calendar />
                Due date
                {#if card.due_by}
                    <button class="clear" onclick={() => card.due_by = ""} title="Clear due date">
                        <Trash />
                    </button>
                {/if}
            </span>
            <div class="prop-value">
                {#if card.due_by}
                    <input id="due_date" type="datetime-local" bind:value={
                        () => zonedToLocal(card.due_by),
                        (v) => card.due_by = localToZoned(v) ?? ""
                    } />
                    <div class="timetip">
                        {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(card.due_by))}
                    </div>
                {:else}
                    <button class="add" onclick={() => card.due_by = tomorrowDate().toISOString()}>+ Assign Due Date</button>
                {/if}
            </div>
        </div>
        <div class="property">
            <span class="prop-label"><Clock /> Duration</span>
            <div class="prop-value duration">
                <input type="number" min="0" bind:value={card.duration_days} placeholder="Duration in days" />
                <span>days</span>
            </div>
        </div>
        <div class="property dependencies">
            <span class="prop-label"><ListTree /> Dependencies</span>
            <div class="prop-value">
                {#if boardCards && "id" in card}
                    <CardDependencySelector
                        bind:dependencies={card.dependencies}
                        {boardCards}
                        onopendependency={onopendependency}
                        onselectcard={allowSelectingDependencies ? async (message, callback) => {
                            if(!onopendependency) return;
                            if(!("id" in card)) return;
                            onselectdependency?.({
                                message, callback,
                                originalSelection: card.id
                            });
                        } : undefined}
                    />
                {:else}
                    <span class="empty">Add dependencies after creating the card.</span>
                {/if}
            </div>
        </div>
    </div>

    {#each metadataItems as { icon, title, fields }}
        <h3>
            <!-- svelte-ignore svelte_component_deprecated - this could be a v4 component -->
            {#if icon}<svelte:component this={icon} />{/if}
            {title}
        </h3>
        <CardFieldCategory {fields} bind:card />
    {/each}
    {#if extraItems && extraItems.length > 0}
        <h3><FileQuestionMark /> Other</h3>
        <CardFieldCategory fields={extraItems} bind:card />
    {/if}
</div>

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
</style>