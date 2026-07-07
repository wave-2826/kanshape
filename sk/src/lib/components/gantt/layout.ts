// Gantt chart layout is a relatively complex problem solved in different ways across software.
// Our implementation is a pretty simple "critical path method"-like approach based on
// what tasks have deadlines. Deadlines at either the start or end of a chain of dependencies
// can define the chain position, and tasks without a fixed deadline or duration flex to fill the
// remaining space. If there aren't two fixed points, the start of the chain is placed as late as
// possible or end of the chain as early as possible.
// Of course, there is a little more nuance since there can be deadlines in the middle and tasks
// flex around them.

// This is.. very bad right now. I spent no effort on it. it's a work-in-progress, to say the least.

import type { TypedCardPreviewResponse } from "$lib/data/kanban";

interface CardLayout {
    start: Date;
    end: Date;
    card: TypedCardPreviewResponse;
}

interface CardNode {
    card: TypedCardPreviewResponse;
    dependencies: string[];
    dependents: string[];
    duration: number; // in days, minimum 1
    dueBy: Date | null; // due_by date
    created: Date; // created date
    // Calculated fields
    earliestStart: number; // days from epoch
    earliestFinish: number;
    latestStart: number;
    latestFinish: number;
    slack: number;
    isFixed: boolean; // has fixed deadline or duration
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_DURATION_DAYS = 1;
const DEFAULT_DURATION_DAYS = 1.5;
const DEFAULT_FLEX_DAYS = 7; // default flex window when no fixed points

function dateToDays(date: Date): number {
    return Math.floor(date.getTime() / DAY_MS);
}

function daysToDate(days: number): Date {
    return new Date(days * DAY_MS);
}

function parseDate(dateStr: string | undefined | null): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

function getCardDuration(card: TypedCardPreviewResponse): number {
    const duration = card.duration_days === 0 ? DEFAULT_DURATION_DAYS : card.duration_days;
    return Math.max(duration, MIN_DURATION_DAYS);
}

function getCardDueBy(card: TypedCardPreviewResponse): Date | null {
    return parseDate(card.due_by);
}

function getCardCreated(card: TypedCardPreviewResponse): Date {
    return parseDate(card.created) ?? new Date();
}

function buildCardNodes(cards: TypedCardPreviewResponse[]): Map<string, CardNode> {
    const nodes = new Map<string, CardNode>();

    // First pass: create nodes with basic info
    for (const card of cards) {
        const duration = getCardDuration(card);
        const dueBy = getCardDueBy(card);
        const created = getCardCreated(card);
        
        // A task is "fixed" if it has a due date OR a non-default duration
        const isFixed = dueBy !== null || card.duration_days !== undefined && card.duration_days > 0;
        
        nodes.set(card.id, {
            card,
            dependencies: card.dependencies ?? [],
            dependents: [],
            duration,
            dueBy,
            created,
            earliestStart: -Infinity,
            earliestFinish: -Infinity,
            latestStart: Infinity,
            latestFinish: Infinity,
            slack: 0,
            isFixed
        });
    }

    // Second pass: build dependents list
    for (const [id, node] of nodes) {
        for (const depId of node.dependencies) {
            const depNode = nodes.get(depId);
            if (depNode) {
                depNode.dependents.push(id);
            }
        }
    }

    return nodes;
}

function topologicalSort(nodes: Map<string, CardNode>): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: string[] = [];

    function visit(id: string) {
        if (temp.has(id)) {
            // Cycle detected - skip to avoid infinite loop
            return;
        }
        if (visited.has(id)) return;
        
        temp.add(id);
        const node = nodes.get(id);
        if (node) {
            for (const depId of node.dependencies) {
                if (nodes.has(depId)) {
                    visit(depId);
                }
            }
        }
        temp.delete(id);
        visited.add(id);
        result.push(id);
    }

    for (const id of nodes.keys()) {
        if (!visited.has(id)) {
            visit(id);
        }
    }

    return result;
}

function forwardPass(nodes: Map<string, CardNode>, topoOrder: string[]): void {
    for (const id of topoOrder) {
        const node = nodes.get(id)!;
        
        // Earliest start is the max of all dependencies' earliest finish
        let earliestStart = -Infinity;
        for (const depId of node.dependencies) {
            const depNode = nodes.get(depId);
            if (depNode && depNode.earliestFinish !== -Infinity) {
                earliestStart = Math.max(earliestStart, depNode.earliestFinish);
            }
        }
        
        // If no dependencies or all deps have -Infinity, use created date as earliest start
        if (earliestStart === -Infinity) {
            earliestStart = dateToDays(node.created);
        }
        
        // If task has a due date, it constrains the earliest finish
        if (node.dueBy !== null) {
            const dueDays = dateToDays(node.dueBy);
            // Task must finish by due date, so earliest start is constrained
            earliestStart = Math.min(earliestStart, dueDays - node.duration);
        }
        
        node.earliestStart = earliestStart;
        node.earliestFinish = earliestStart + node.duration;
    }
}

function backwardPass(nodes: Map<string, CardNode>, topoOrder: string[]): void {
    const reversedOrder = [...topoOrder].reverse();
    
    for (const id of reversedOrder) {
        const node = nodes.get(id)!;
        
        // Latest finish is the min of all dependents' latest start
        let latestFinish = Infinity;
        for (const depId of node.dependents) {
            const depNode = nodes.get(depId);
            if (depNode && depNode.latestStart !== Infinity) {
                latestFinish = Math.min(latestFinish, depNode.latestStart);
            }
        }
        
        // If task has a due date, that constrains the latest finish
        if (node.dueBy !== null) {
            const dueDays = dateToDays(node.dueBy);
            latestFinish = Math.min(latestFinish, dueDays);
        }
        
        // If no dependents and no due date, use a default flex window from created date
        if (latestFinish === Infinity) {
            const createdDays = dateToDays(node.created);
            latestFinish = createdDays + DEFAULT_FLEX_DAYS;
        }
        
        node.latestFinish = latestFinish;
        node.latestStart = latestFinish - node.duration;
        node.slack = node.latestStart - node.earliestStart;
    }
}

function resolvePositions(nodes: Map<string, CardNode>): void {
    // For tasks with zero slack (critical path), use earliest start
    // For tasks with slack, we can position them anywhere in their slack window
    // We place tasks with fixed deadlines at their latest possible position
    // (as late as possible), and flex tasks fill the gaps
    
    for (const node of nodes.values()) {
        if (node.slack <= 0) {
            // Critical path - use earliest start
            node.earliestStart = node.earliestStart;
        } else if (node.dueBy !== null) {
            // Has a deadline - schedule as late as possible (latest start)
            node.earliestStart = node.latestStart;
        } else if (node.duration > MIN_DURATION_DAYS || node.card.duration_days !== undefined) {
            // Has explicit duration but no deadline - schedule as late as possible
            node.earliestStart = node.latestStart;
        } else {
            // Flexible task - place at earliest start (as early as possible)
            node.earliestStart = node.earliestStart;
        }
        node.earliestFinish = node.earliestStart + node.duration;
    }
}

function layoutCardsToGantt(cards: TypedCardPreviewResponse[]): CardLayout[] {
    if (cards.length === 0) return [];
    
    // Build the dependency graph
    const nodes = buildCardNodes(cards);
    const topoOrder = topologicalSort(nodes);
    
    // Forward pass: calculate earliest start/finish times
    forwardPass(nodes, topoOrder);
    
    // Backward pass: calculate latest start/finish times
    backwardPass(nodes, topoOrder);
    
    // Resolve final positions
    resolvePositions(nodes);
    
    // Convert to layout output
    const layouts: CardLayout[] = [];
    for (const card of cards) {
        const node = nodes.get(card.id);
        if (node) {
            layouts.push({
                start: daysToDate(node.earliestStart),
                end: daysToDate(node.earliestFinish),
                card
            });
        }
    }
    
    // Sort by start date for consistent output
    layouts.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    return layouts;
}

export { layoutCardsToGantt, type CardLayout };