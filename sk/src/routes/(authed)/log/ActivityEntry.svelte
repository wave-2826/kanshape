<!-- messiest rendering code i've ever written oml -->
<!-- a cleaner implementation may be generating rich text and rendering separately -->

<script lang="ts">
    import type { EntryChanges, EntryValue } from "$lib/data/activity";
    import { getPriorityColor } from "$lib/data/cards";
    import { relativeTime } from "$lib/datetime";
    import { nav } from "$lib/navigation";
    import { queryOne } from "$lib/pocketbase";
    import { CardsPriorityOptions, Collections, type ActivityLogPreviewRecord } from "$lib/pocketbase/generated-types";

    const {
        entry,
        hideProject = false
    }: {
        entry: ActivityLogPreviewRecord,
        hideProject?: boolean
    } = $props();

    const changes = $derived<EntryChanges>(entry.changes as EntryChanges);

    function truncate(value: string | null, maxLength: number = 50): string | null {
        if(!value) return null;
        if(value.length > maxLength) {
            return `${value.substring(0, maxLength)}...`;
        }
        return value;
    }

    const fieldLabels: {
        [entityType: string]: {
            [field: string]: {
                label: string,
                type: "name" | "description" | "string" | "duration" | "due" | "color" | "priority" | "section" | "assignment" | "any" | "card_metadata"
            }
        }
    } = {
        card: {
            // "title", "description", "section", "subprojects", "board", "priority", "metadata", "due_by", "duration_days", "dependencies", "assignment_data"
            title: { label: "title", type: "name" },
            description: { label: "description", type: "description" },
            section: { label: "section", type: "section" },
            subprojects: { label: "subprojects", type: "any" },
            board: { label: "board", type: "any" },
            priority: { label: "priority", type: "priority" },
            metadata: { label: "metadata", type: "card_metadata" },
            due_by: { label: "due date", type: "due" },
            duration_days: { label: "duration", type: "duration" },
            dependencies: { label: "dependencies", type: "any" },
            assignment_data: { label: "assignments", type: "assignment" }
        },
        board: {
            // "title", "description", "type", "part_id_prefix", "custom_card_fields", "linked_sites"
            title: { label: "title", type: "name" },
            description: { label: "description", type: "description" },
            type: { label: "type", type: "string" },
            part_id_prefix: { label: "part ID prefix", type: "string" },
            custom_card_fields: { label: "custom card fields", type: "any" },
            linked_sites: { label: "linked sites", type: "any" }
        },
        project: {
            // "title", "description", "color", "linked_sites"
            title: { label: "title", type: "name" },
            description: { label: "description", type: "description" },
            color: { label: "color", type: "color" },
            linked_sites: { label: "linked sites", type: "any" }
        },
        section: {
            // "title", "description", "color", "is_completed"
            title: { label: "title", type: "name" },
            description: { label: "description", type: "description" },
            color: { label: "color", type: "color" },
            is_completed: { label: "completion status", type: "string" }
        },
        subproject: {
            // "name", "description", "linked_sites"
            name: { label: "name", type: "name" },
            description: { label: "description", type: "description" },
            linked_sites: { label: "linked sites", type: "any" }
        }
    }
    
    function getUpdateDescription(changeField: string, definite: boolean): {
        specialType?: "color" | "priority" | "rename" | "assignments" | "section";
        action: string;
        oldValue: string | null;
        newValue: string | null;
    } {
        const change = changes[changeField];
        if(!change) return { action: "updated", oldValue: null, newValue: null };

        const fieldData = fieldLabels[entry.entity_type]?.[changeField] ?? { label: changeField, type: "any" };

        switch(fieldData.type) {
            case "name":
                return {
                    specialType: "rename",
                    action: definite ? "renamed" : "renamed it",
                    oldValue: truncate(String(change.old)),
                    newValue: truncate(String(change.new))
                }
            case "description":
                return {
                    action: definite ? `updated the ${fieldData.label} of` : `updated its ${fieldData.label}`,
                    oldValue: null,
                    newValue: null
                }
            case "string":
                return {
                    action: definite ? `updated the ${fieldData.label} of` : `updated its ${fieldData.label}`,
                    oldValue: '"' + truncate(String(change.old)) + '"',
                    newValue: '"' + truncate(String(change.new)) + '"'
                }
            case "duration":
                return {
                    action: definite ? `updated the ${fieldData.label} of` : `updated its ${fieldData.label}`,
                    oldValue: change.old ? `${change.old} days` : null,
                    newValue: change.new ? `${change.new} days` : "none"
                }
            case "due":
                const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
                return {
                    action: definite ? `updated the ${fieldData.label} of` : `updated its ${fieldData.label}`,
                    oldValue: change.old && typeof change.old === "string" ? fmt.format(new Date(change.old)) : null,
                    newValue: change.new && typeof change.new === "string" ? fmt.format(new Date(change.new)) : "none"
                }
            case "color":
                return {
                    specialType: "color",
                    action: definite ? `updated the ${fieldData.label} of` : `updated its ${fieldData.label}`,
                    oldValue: String(change.old),
                    newValue: String(change.new)
                }
            case "section":
                return {
                    specialType: "section",
                    action: definite ? `moved` : `moved it`,
                    oldValue:
                        change.old && typeof change.old !== "string" &&
                        "title" in change.old ? change.old.title : null,
                    newValue:
                        change.new && typeof change.new !== "string" &&
                        "title" in change.new ? change.new.title : null
                }
            case "assignment":
                return {
                    specialType: "assignments",
                    action: definite ? `reassigned` : `reassigned it`,
                    // handled manually to format
                    oldValue: null, newValue: null
                }
            case "priority":
                return {
                    specialType: "priority",
                    action: definite ? `updated the ${fieldData.label} of` : `updated its ${fieldData.label}`,
                    oldValue: change.old ? String(change.old) : null,
                    newValue: change.new ? String(change.new) : "none"
                }
            case "card_metadata":
                // TODO: better logic here. I'd like to refactor this first though
                return {
                    action: definite ? `updated the board fields of` : `updated its board fields`,
                    oldValue: null,
                    newValue: null
                }
            default:
                return {
                    action: definite ? `updated the ${fieldData.label} of` : `updated its ${fieldData.label}`,
                    oldValue: null,
                    newValue: null
                }
        }
    }
</script>

<button class="activity" onclick={async () => {
    // best effort to open relevant card or project page
    if(entry.entity_type === "project" && entry.entity_id) {
        nav(`/projects/${entry.entity_id}`);
    } else if(entry.entity_type === "subproject" && entry.entity_id) {
        nav(`/projects/${entry.project_id}/subprojects/${entry.entity_id}`);
    } else if(entry.entity_type === "board" && entry.entity_id) {
        nav(`/projects/${entry.project_id}/boards/${entry.entity_id}`);
    } else if(entry.entity_type === "card" && entry.entity_id) {
        // this is unfortunate. I'm not a fan but also don't want to include extra info in every entry..
        const card = await queryOne(Collections.Cards, entry.entity_id).catch(() => null);
        if(card) {
            nav(`/projects/${entry.project_id}/boards/${card.board}?card=${entry.entity_id}`);
        } else {
            nav(`/projects/${entry.project_id}`);
        }
    } else if(entry.project_id) {
        nav(`/projects/${entry.project_id}`);
    }
}}>
    <span class="time" title={new Date(entry.date).toLocaleString()}>
        {relativeTime(new Date(entry.date))}
    </span>
    <span class="description" style="--project-color: {entry.project_color || "var(--text-primary)"}">
        <span class="user">{entry.actor_name}</span>
        {#if entry.action === "create"}
            created a new {entry.entity_type}
            {#if entry.entity_title}
                <span class="entity-name {entry.entity_type}">{truncate(entry.entity_title, 80)}</span>
            {/if}
        {:else if entry.action === "update"}
            {#each Object.keys(changes) as field, i}
                {#if i > 0 && Object.keys(changes).length > 2}<span class="collapse">, </span>{/if}
                {#if i === Object.keys(changes).length - 1 && i > 0}<span class="collapse">and </span>{/if}
                {@const { specialType, action, oldValue, newValue } = getUpdateDescription(field, i === 0)}
                {action}
                {#if specialType === "rename"}
                    {#if i === 0}<span>{oldValue}</span>{/if}
                    to <span class="entity-name {entry.entity_type}">{newValue}</span>
                {:else if specialType === "color"}
                    {#if i === 0}<span class="entity-name {entry.entity_type}">{truncate(entry.entity_title ?? null, 80)}</span>{/if}
                    {#if oldValue}from <span style="color: {oldValue}">{oldValue}</span>{/if}
                    {#if newValue}to <span style="color: {newValue}">{newValue}</span>
                    {:else}to <span>none</span>{/if}
                {:else if specialType === "priority"}
                    {#if i === 0}<span class="entity-name {entry.entity_type}">{truncate(entry.entity_title ?? null, 80)}</span>{/if}
                    from <span style="color: {getPriorityColor(oldValue as CardsPriorityOptions)}">{oldValue}</span>
                    to <span style="color: {getPriorityColor(newValue as CardsPriorityOptions)}">{newValue}</span>
                {:else if specialType === "assignments"}
                    {#if i === 0}<span class="entity-name {entry.entity_type}">{truncate(entry.entity_title ?? null, 80)}</span>{/if}
                    {@const newVal = changes[field].new}
                    {#if newVal && typeof newVal === "object" && "assignment" in newVal}
                        {@const assignment = newVal.assignment}
                        to
                        {#if !assignment}
                            no assignment
                        {:else if assignment.type === "anyone_on"}
                            anyone on {new Date(assignment.on_date).toLocaleDateString()}
                        {:else if assignment.type === "looking_for_assignment"}
                            looking for assignment
                        {:else}
                            {@const names = newVal.names ?? []}
                            {#if names.length === 0}no {assignment.type}
                            {:else if names.length === 1}<span class="user">{names[0]}</span>
                            {:else if names.length === 2}<span class="user">{names[0]}</span> and <span class="user">{names[1]}</span>
                            {:else}<span class="user">{names[0]}</span> and {names.length - 1} others
                            {/if}
                        {/if}
                    {/if}
                {:else if specialType === "section"}
                    {@const sectionColor = (s: EntryValue) => {
                        if(!s || typeof s === "string" || !("color" in s)) return "var(--text-primary)";
                        return s.color ?? "var(--text-primary)";
                    }}
                    {#if i === 0}<span class="entity-name {entry.entity_type}">{truncate(entry.entity_title ?? null, 80)}</span>{/if}
                    {#if oldValue}from <span style="color: {sectionColor(changes[field].old)}">{oldValue}</span>{/if}
                    {#if newValue}to <span style="color: {sectionColor(changes[field].new)}">{newValue}</span>
                    {:else}to <span>none</span>{/if}
                {:else}
                    {#if i === 0}<span class="entity-name {entry.entity_type}">{truncate(entry.entity_title ?? null, 80)}</span>{/if}
                    {#if oldValue}from <span>{oldValue}</span>{/if}
                    {#if newValue}to <span>{newValue}</span>{/if}
                {/if}
            {/each}
        {:else if entry.action === "delete"}
            deleted the {entry.entity_type}
            {#if entry.entity_title}
                <span class="entity-name {entry.entity_type}">{truncate(entry.entity_title, 80)}</span>
            {/if}
        {/if}
        {#if entry.project_title && entry.entity_type !== "project" && !hideProject}
            in <span class="project">{entry.project_title}</span>
        {/if}
    </span>
</button>

<style lang="scss">
.activity {
    display: flex;
    flex-direction: row;
    align-items: center;
    text-align: left;
    gap: 1rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    --bg-color: var(--bg-primary);

    .time {
        color: var(--text-tertiary);
        font-size: var(--font-tiny);
        white-space: nowrap;
        width: 5rem;
        flex-shrink: 0;
    }

    .description {
        color: var(--text-secondary);
        span {
            color: var(--text-primary);
            margin: 0 0.125rem;

            & + span.collapse {
                margin-right: 0;
            }
        }
        .collapse {
            margin: 0;
            color: var(--text-tertiary);
        }
        .user {
            color: var(--accent);
        }
        .project {
            color: var(--project-color);
        }
        .entity-name {
            font-style: italic;
        }
    }
}
</style>