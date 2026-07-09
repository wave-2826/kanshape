// Gantt chart layout is a relatively complex problem solved in different ways across software.
// Our implementation is a pretty simple "critical path method"-inspired approach based on
// what tasks have deadlines. Deadlines define a fixed task end date, which can't be moved no
// matter what. Tasks with a duration are further constrained by that, while tasks without flex
// to evenly fill the remaining space between fixed deadline locations. Tasks with dependencies
// are placed after their dependencies, and tasks without have default placement based on their
// creation date and the default duration if none is specified. Dependency chains that aren't fixed
// at their ends are compacted inward as close to the nearest fixed point as possible. Cycles and
// other illegal structures simply cause fallback to default task placement.

import type { TypedCardPreviewResponse } from "$lib/data/kanban";

export const DEFAULT_DURATION_DAYS = 2;
const DAY_MS = 86_400_000; // 24 * 60 * 60 * 1000

type GanttCardPreview = Pick<TypedCardPreviewResponse, "id" | "dependencies" | "duration_days" | "due_by" | "created">;

export type CardLayout<T extends GanttCardPreview> = {
    start: Date;
    end: Date;
    card: T;
};

export function layoutCardsToGantt<T extends GanttCardPreview>(cards: T[]): CardLayout<T>[] {
    if(cards.length === 0) return [];

    const cardMap = new Map(cards.map(c => [c.id, c]));
    const placement = new Map<string, { start: number; end: number }>();
    const resolved = new Set<string>();

    // cycle detection with DFS and gray/black coloring
    // white means the node is unvisited, gray means it's being visited, and black means it's done.
    // if a node is ever pointing into a gray node, there must be a cycle.
    // lowkey I still don't fully understand how this works so read this: https://www.usna.edu/Users/cs/wcbrown/courses/S18SI335/lec/l15/lec.html
    const cyclic = new Set<string>();

    {
        const WHITE = 0, GRAY = 1, BLACK = 2;
        const color = new Map<string, number>();
        for(const c of cards) color.set(c.id, WHITE);

        const dfs = (id: string, path: string[]) => {
            color.set(id, GRAY);
            path.push(id);
            const card = cardMap.get(id);
            if(card) {
                for(const dep of card.dependencies) {
                    if(!cardMap.has(dep)) continue;
                    const c = color.get(dep);
                    if(c === GRAY) {
                        const idx = path.indexOf(dep);
                        for(let i = idx; i < path.length; i++) cyclic.add(path[i]);
                    } else if(c === WHITE) {
                        dfs(dep, path);
                    }
                }
            }
            path.pop();
            color.set(id, BLACK);
        };

        for(const c of cards) {
            if(color.get(c.id) === WHITE) dfs(c.id, []);
        }

        // tasks depending on cyclic tasks also fall back to default even if not strictly cyclic
        let changed = true;
        while(changed) {
            changed = false;
            for(const c of cards) {
                if(cyclic.has(c.id)) continue;
                if(c.dependencies.some(d => cyclic.has(d))) {
                    cyclic.add(c.id);
                    changed = true;
                }
            }
        }
    }

    function validDeps(card: T): string[] {
        return card.dependencies.filter(d => cardMap.has(d) && !cyclic.has(d));
    }

    function placeDefault(card: T): void {
        const created = new Date(card.created).getTime();
        if(card.due_by && card.duration_days > 0) {
            const due = new Date(card.due_by).getTime();
            placement.set(card.id, { start: due - card.duration_days * DAY_MS, end: due });
        } else if(card.due_by) {
            const due = new Date(card.due_by).getTime();
            placement.set(card.id, { start: due - DEFAULT_DURATION_DAYS * DAY_MS, end: due });
        } else {
            const dur = card.duration_days > 0 ? card.duration_days : DEFAULT_DURATION_DAYS;
            placement.set(card.id, { start: created, end: created + dur * DAY_MS });
        }
        resolved.add(card.id);
    }

    // place cyclic tasks in default positions since there's no point trying to figure out the loop
    for(const card of cards) {
        if(cyclic.has(card.id)) placeDefault(card);
    }

    // acyclic tasks are the ones we can actually layout with the critical path method
    const acyclic = cards.filter(c => !cyclic.has(c.id));

    const dependents = new Map<string, string[]>();
    for(const card of acyclic) dependents.set(card.id, []);
    for(const card of acyclic) {
        for(const dep of validDeps(card)) {
            dependents.get(dep)!.push(card.id);
        }
    }

    // topological sort with kahn's algorithm
    const inDegree = new Map<string, number>();
    for(const card of acyclic) inDegree.set(card.id, validDeps(card).length);
    const queue: T[] = acyclic.filter(c => inDegree.get(c.id) === 0);
    const topo: T[] = [];
    while(queue.length > 0) {
        const card = queue.shift()!;
        topo.push(card);
        for(const succId of dependents.get(card.id) ?? []) {
            inDegree.set(succId, inDegree.get(succId)! - 1);
            if(inDegree.get(succId) === 0) queue.push(cardMap.get(succId) as T);
        }
    }
    // fallback for any tasks not in topo (shouldn't happen??)
    for(const card of acyclic) {
        if(!topo.includes(card)) placeDefault(card);
    }

    // forward pass: earliest start / earliest finish
    const earliestStart = new Map<string, number>();
    const earliestFinish = new Map<string, number>();
    for(const card of topo) {
        if(resolved.has(card.id)) continue;
        const deps = validDeps(card);
        const start = deps.length === 0
            ? new Date(card.created).getTime()
            : Math.max(...deps.map(d => earliestFinish.get(d) ?? placement.get(d)!.end));

        if(card.due_by) {
            const due = new Date(card.due_by).getTime();
            if(card.duration_days > 0) {
                // fixed anchor, so end is locked at the due date and the start is due date - duration
                earliestStart.set(card.id, due - card.duration_days * DAY_MS);
                earliestFinish.set(card.id, due);
            } else {
                // no duration, so the end is locked at the due date and the start is flexible
                earliestStart.set(card.id, start);
                earliestFinish.set(card.id, due);
            }
        } else {
            earliestStart.set(card.id, start);
            earliestFinish.set(card.id, card.duration_days > 0 ? start + card.duration_days * DAY_MS : start);
        }
    }

    // backward pass: latest finish / latest start
    const latestStart = new Map<string, number>();
    const latestFinish = new Map<string, number>();
    for(let i = topo.length - 1; i >= 0; i--) {
        const card = topo[i];
        if(resolved.has(card.id)) continue;
        const succs = dependents.get(card.id) ?? [];
        const finish = card.due_by
            ? new Date(card.due_by).getTime()
            : succs.length > 0
                ? Math.min(...succs.map(d => latestStart.get(d) ?? Infinity))
                : Infinity;
        latestFinish.set(card.id, finish);
        latestStart.set(card.id, card.duration_days > 0 ? finish - card.duration_days * DAY_MS : finish);
    }

    // place fixed anchors where due_by and duration are set
    for(const card of acyclic) {
        if(resolved.has(card.id)) continue;
        if(card.due_by && card.duration_days > 0) {
            const due = new Date(card.due_by).getTime();
            placement.set(card.id, { start: due - card.duration_days * DAY_MS, end: due });
            resolved.add(card.id);
        }
    }

    function actualEnd(id: string): number {
        if(placement.has(id)) return placement.get(id)!.end;
        const lfVal = latestFinish.get(id);
        if(lfVal !== undefined && lfVal !== Infinity) return lfVal;
        return earliestFinish.get(id) ?? new Date(cardMap.get(id)!.created).getTime();
    }

    function placeStandaloneFlex(card: T): void {
        const deps = validDeps(card);
        const startEs = deps.length > 0
            ? Math.max(...deps.map(d => actualEnd(d)))
            : earliestStart.get(card.id) ?? new Date(card.created).getTime();

        if(card.due_by) {
            // end of a flex chain
            const due = new Date(card.due_by).getTime();
            placement.set(card.id, { start: Math.max(due - DEFAULT_DURATION_DAYS * DAY_MS, startEs), end: due });
        } else {
            const lfVal = latestFinish.get(card.id) ?? Infinity;
            if(lfVal !== Infinity && lfVal > startEs) {
                // Fill the gap between earliest start and latest finish
                placement.set(card.id, { start: startEs, end: lfVal });
            } else {
                // no constraints, so use the default duration
                placement.set(card.id, { start: startEs, end: startEs + DEFAULT_DURATION_DAYS * DAY_MS });
            }
        }
        resolved.add(card.id);
    }

    // resolve a flex chain (path of flex and flow tasks between fixed points)
    function resolveFlexChain(startCard: T): void {
        // flex task with a fixed end is a chain endpoint, not starts
        if(startCard.due_by) {
            placeStandaloneFlex(startCard);
            return;
        }

        // trace the chain forward through flex tasks until we hit a fixed point or a branch/merge
        const chain: T[] = [startCard];
        let chainEnd: number | null = null;
        let isLinear = true;
        let current = startCard;

        while(true) {
            const succs = dependents.get(current.id) ?? [];
            if(succs.length === 0) {
                // no successor, so chain ends at latest finish of last task
                chainEnd = latestFinish.get(current.id) ?? Infinity;
                break;
            }
            if(succs.length > 1) {
                // branching
                isLinear = false;
                break;
            }
            const nextId = succs[0];
            if(resolved.has(nextId)) {
                // next task is already placed, so chain ends at its start
                chainEnd = placement.get(nextId)!.start;
                break;
            }
            const next = cardMap.get(nextId) as T;
            // Check if next has only one unresolved predecessor (the current task)
            const unresolvedPreds = validDeps(next).filter(d => !resolved.has(d));
            if(unresolvedPreds.length > 1) {
                // merge point
                isLinear = false;
                break;
            }
            chain.push(next);
            if(next.due_by) {
                // next task has a fixed end, so chain ends at its due date
                chainEnd = new Date(next.due_by).getTime();
                break;
            }
            current = next;
        }

        if(!isLinear) {
            placeStandaloneFlex(startCard);
            return;
        }

        // compute the chain start as the max of actual ends of the first task's predecessors
        const deps = validDeps(startCard);
        const chainStart = deps.length > 0
            ? Math.max(...deps.map(d => actualEnd(d)))
            : earliestStart.get(startCard.id) ?? new Date(startCard.created).getTime();

        if(chainEnd === null || chainEnd === Infinity || chainEnd <= chainStart) {
            // no fixed end, so just place the first task and let the rest flow forward
            let pos = chainStart;
            for(const task of chain) {
                if(resolved.has(task.id)) continue;
                const dur = task.duration_days > 0 ? task.duration_days : DEFAULT_DURATION_DAYS;
                placement.set(task.id, { start: pos, end: pos + dur * DAY_MS });
                resolved.add(task.id);
                pos += dur * DAY_MS;
            }
        } else {
            // distribute the duration by evenly splitting among flex tasks and using fixed
            // durations for the rest of the flow tasks
            const span = chainEnd - chainStart;
            const fixedMs = chain.reduce((s, t) => s + (t.duration_days > 0 ? t.duration_days * DAY_MS : 0), 0);
            const flexCount = chain.filter(t => t.duration_days === 0).length;
            const flexMs = flexCount > 0 ? Math.max(0, (span - fixedMs) / flexCount) : 0;

            let pos = chainStart;
            for(const task of chain) {
                if(resolved.has(task.id)) continue;
                const dur = task.duration_days > 0 ? task.duration_days * DAY_MS : flexMs;
                placement.set(task.id, { start: pos, end: pos + dur });
                resolved.add(task.id);
                pos += dur;
            }
        }
    }

    // process the remaining tasks in topological order
    for(const card of topo) {
        if(resolved.has(card.id)) continue;

        if(card.duration_days > 0 && !card.due_by) {
            // flow tasks compact backward based on their latest start if there's a
            // downstream fixed point, otherwise flow forward from actual predecessor ends
            const lfVal = latestFinish.get(card.id) ?? Infinity;
            const start = lfVal !== Infinity
                ? latestStart.get(card.id)!
                : (validDeps(card).length > 0
                    ? Math.max(...validDeps(card).map(d => actualEnd(d)))
                    : new Date(card.created).getTime());
            placement.set(card.id, { start, end: start + card.duration_days * DAY_MS });
            resolved.add(card.id);
        } else if(card.duration_days === 0) {
            // flex tasks are resolved as chains of flex tasks between fixed points
            resolveFlexChain(card);
        }
    }

    return cards.map(card => {
        const p = placement.get(card.id);
        if(!p) {
            // shouldn't happen but fallback to default placement if it does
            console.warn(`Card ${card.id} was not placed in the Gantt layout, falling back to default placement.`);
            const created = new Date(card.created).getTime();
            const dur = (card.duration_days > 0 ? card.duration_days : DEFAULT_DURATION_DAYS) * DAY_MS;
            return { start: new Date(created), end: new Date(created + dur), card };
        }
        return { start: new Date(p.start), end: new Date(p.end), card };
    });
}