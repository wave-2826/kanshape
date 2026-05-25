<script lang="ts">
    import { type SectionsRecord, type SubprojectsRecord } from "$lib/pocketbase/generated-types";
    import { Clock, Flag, Kanban, TextInitial, Users } from "lucide-svelte";
    import { getPriorityColor, type CardAssignmentData } from "./cards";
    import RelativeTime from "../RelativeTime.svelte";
    import { formatCloseDate, localDateFromDateOnly } from "$lib/datetime";
    import type { TypedCardPreviewResponse } from "./kanban";
    
    const {
        card,
        subprojects,
        sections,
        onclick
    }: {
        card: TypedCardPreviewResponse;
        subprojects: SubprojectsRecord[];
        sections: SectionsRecord[];
        onclick: () => void;
    } = $props();

    const assignment = $derived(card.assignment_data as CardAssignmentData | null);

    const section = $derived(sections.find(s => s.id === card.section) ?? null);
</script>

<button class="card" {onclick} class:critical={card.priority === "critical"}>
    <div class="main">
        <h3>{card.title}</h3>
        {#if card.subproject !== ""}
            <span class="meta-pill subproject"><Kanban />{subprojects.find((sp) => sp.id === card.subproject)?.name ?? card.subproject}</span>
        {/if}

        <span class="meta-pill section" style="color: {section?.color ?? 'var(--text-primary)'}"><Kanban />{section?.title ?? card.section}</span>

        <span class="meta-pill" style="color: {getPriorityColor(card.priority)}"><Flag />{card.priority}</span>

        {#if card.due_by}
            <span class="meta-pill" style="{new Date(card.due_by) < new Date() ? 'color: var(--error)' : ""}" title={`Due ${
                new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(card.due_by))
            }`}>
                <Clock />
                <span><RelativeTime date={new Date(card.due_by)} /></span>
            </span>
        {/if}

        {#if assignment}
            <span class="meta-pill assignment" class:looking-for-assignment={assignment.type === "looking_for_assignment"}>
                <Users />
                <span>
                    {#if assignment.type === "users" || assignment.type === "groups"}
                        {#if card.assignment_name_cache?.length === 0}
                            Unassigned
                        {:else if card.assignment_name_cache?.length === 1}
                            <span class="item-name">{card.assignment_name_cache[0]}</span>
                        {:else if card.assignment_name_cache}
                            <span class="item-name">{card.assignment_name_cache[0]}</span> +{card.assignment_name_cache.length - 1}
                        {:else}
                            Assigned
                        {/if}
                    {:else if assignment.type === "anyone_on"}
                        <span class="item-name">Anyone</span> {formatCloseDate(localDateFromDateOnly(assignment.on_date))}
                    {:else if assignment.type === "looking_for_assignment"}
                        Looking for assignment
                    {/if}
                </span>
            </span>
        {/if}
    </div>

    {#if card.description}
        <div class="description"><TextInitial /><span>{card.description}</span></div>
    {/if}
</button>

<style lang="scss">
.card {
    --bg-color: var(--bg-secondary);

    display: flex;
    flex-direction: column;
    align-items: flex-start;
    overflow: hidden;
    text-align: left;

    padding: 0.25rem 0.7rem;
    font-size: var(--font-tiny);

    &.critical {
        border-left: 2px solid var(--error);
    }
}

.main {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.25rem;

    h3 {
        margin: 0;
        font-size: var(--font-small);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .subproject {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--text-tertiary);
        font-size: var(--font-tiny);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.description {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--text-tertiary);
    font-style: italic;

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }
}

.meta-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-primary);
    font-size: var(--font-tiny);
    white-space: nowrap;
    min-width: 0;

    border-radius: 100vh;
    padding: 0.1rem 0.4rem;
    background-color: var(--bg-primary);

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.assignment {
    &.looking-for-assignment { color: var(--error); }
    .item-name { color: var(--accent); }
}

.main, .description {
    max-width: 100%;
}
</style>