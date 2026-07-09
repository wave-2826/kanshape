import { describe, expect, test } from "vitest";
import { DEFAULT_DURATION_DAYS, layoutCardsToGantt } from "./layout";
import type { IsoAutoDateString } from "$lib/pocketbase/generated-types";

function autodate(dateStr: string): IsoAutoDateString {
    return new Date(dateStr).toISOString() as IsoAutoDateString;
}
function plusDays(date: Date, days: number): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
}

describe("gantt layout", () => {
    test("single dependency, fixed first task", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 2,
                due_by: autodate("2026-01-05"),
            },
            {
                id: "2",
                created: autodate("2026-01-02"),
                dependencies: ["1"],
                duration_days: 3,
                due_by: ""
            }
        ]);

        expect(layout).toHaveLength(2);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;

        expect(task1.start).toEqual(new Date("2026-01-03"));
        expect(task1.end).toEqual(new Date("2026-01-05")); // 2 days duration
        expect(task2.start).toEqual(new Date("2026-01-05"));
        expect(task2.end).toEqual(new Date("2026-01-08")); // 3 days duration
    });

    test("due date with no duration is handled correctly", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 0,
                due_by: autodate("2026-01-05"),
            }
        ]);

        expect(layout).toHaveLength(1);
        const task1 = layout.find(l => l.card.id === "1")!;

        expect(task1.start).toEqual(plusDays(new Date("2026-01-05"), -DEFAULT_DURATION_DAYS));
        expect(task1.end).toEqual(new Date("2026-01-05"));
    });

    test("fixed ends, flex middle task", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 1,
                due_by: autodate("2026-01-05"),
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 0,
                due_by: ""
            },
            {
                id: "3",
                created: autodate("2026-01-01"),
                dependencies: ["2"],
                duration_days: 1,
                due_by: autodate("2026-01-10")
            }
        ]);

        expect(layout).toHaveLength(3);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;
        const task3 = layout.find(l => l.card.id === "3")!;

        expect(task1.start).toEqual(new Date("2026-01-04"));
        expect(task1.end).toEqual(new Date("2026-01-05")); // 1 day duration
        expect(task2.start).toEqual(new Date("2026-01-05"));
        expect(task2.end).toEqual(new Date("2026-01-09")); // flex duration
        expect(task3.start).toEqual(new Date("2026-01-09"));
        expect(task3.end).toEqual(new Date("2026-01-10")); // 1 day duration
    });

    test("circular dependency detection", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: ["2"],
                duration_days: 1,
                due_by: autodate("2026-01-05"),
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 1,
                due_by: autodate("2026-01-10")
            }
        ]);

        expect(layout).toHaveLength(2);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;

        // In case of circular dependency, the layout should still produce a result,
        // but the tasks will just be placed in their default locations without respecting dependencies.
        expect(task1.start).toEqual(new Date("2026-01-04"));
        expect(task1.end).toEqual(new Date("2026-01-05"));
        expect(task2.start).toEqual(new Date("2026-01-09"));
        expect(task2.end).toEqual(new Date("2026-01-10"));
    });

    test("default positioning", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 0,
                due_by: ""
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 4,
                due_by: ""
            }
        ]);

        expect(layout).toHaveLength(2);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;

        // Both tasks have no dependencies and no fixed points, so they should be placed in their default positions
        expect(task1.start).toEqual(new Date("2026-01-01"));
        expect(task1.end).toEqual(plusDays(new Date("2026-01-01"), DEFAULT_DURATION_DAYS));
        expect(task2.start).toEqual(new Date("2026-01-01"));
        expect(task2.end).toEqual(new Date("2026-01-05"));
    });

    test("unconstrained start compacts forward", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 1,
                due_by: ""
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 2,
                due_by: "2026-01-05"
            }
        ]);

        expect(layout).toHaveLength(2);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;

        expect(task1.start).toEqual(new Date("2026-01-02"));
        expect(task1.end).toEqual(new Date("2026-01-03"));
        expect(task2.start).toEqual(new Date("2026-01-03"));
        expect(task2.end).toEqual(new Date("2026-01-05"));
    });

    test("unconstrained end compacts backward", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 2,
                due_by: "2026-01-05"
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 1,
                due_by: ""
            }
        ]);

        expect(layout).toHaveLength(2);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;

        expect(task1.start).toEqual(new Date("2026-01-03"));
        expect(task1.end).toEqual(new Date("2026-01-05"));
        expect(task2.start).toEqual(new Date("2026-01-05"));
        expect(task2.end).toEqual(new Date("2026-01-06"));
    });

    test("flex is split evenly with multiple", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 1,
                due_by: "2026-01-04"
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 0,
                due_by: ""
            },
            {
                id: "3",
                created: autodate("2026-01-01"),
                dependencies: ["2"],
                duration_days: 0,
                due_by: ""
            },
            {
                id: "4",
                created: autodate("2026-01-01"),
                dependencies: ["3"],
                duration_days: 0,
                due_by: "2026-01-07"
            }
        ]);

        expect(layout).toHaveLength(4);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;
        const task3 = layout.find(l => l.card.id === "3")!;
        const task4 = layout.find(l => l.card.id === "4")!;

        expect(task1.start).toEqual(new Date("2026-01-03"));
        expect(task1.end).toEqual(new Date("2026-01-04"));
        expect(task2.start).toEqual(new Date("2026-01-04"));
        expect(task2.end).toEqual(new Date("2026-01-05"));
        expect(task3.start).toEqual(new Date("2026-01-05"));
        expect(task3.end).toEqual(new Date("2026-01-06"));
        expect(task4.start).toEqual(new Date("2026-01-06"));
        expect(task4.end).toEqual(new Date("2026-01-07"));
    });

    test("works with multiple independent chains", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 1,
                due_by: "2026-01-04"
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 2,
                due_by: ""
            },
            {
                id: "3",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 2,
                due_by: "2026-01-06"
            }
        ]);

        expect(layout).toHaveLength(3);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;
        const task3 = layout.find(l => l.card.id === "3")!;

        expect(task1.start).toEqual(new Date("2026-01-03"));
        expect(task1.end).toEqual(new Date("2026-01-04"));
        expect(task2.start).toEqual(new Date("2026-01-04"));
        expect(task2.end).toEqual(new Date("2026-01-06"));
        expect(task3.start).toEqual(new Date("2026-01-04"));
        expect(task3.end).toEqual(new Date("2026-01-06"));
    });

    test("sub-day precision is preserved", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01T12:01:02.123Z"),
                dependencies: [],
                duration_days: 1.5,
                due_by: ""
            }
        ]);

        expect(layout).toHaveLength(1);
        const task1 = layout.find(l => l.card.id === "1")!;
        expect(task1.start).toEqual(new Date("2026-01-01T12:01:02.123Z"));
        expect(task1.end).toEqual(new Date("2026-01-03T00:01:02.123Z"));
    });

    test("dependency dates before creation are preserved", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-05"),
                dependencies: [],
                duration_days: 1,
                due_by: ""
            },
            {
                id: "2",
                created: autodate("2026-01-05"),
                dependencies: ["1"],
                duration_days: 1,
                due_by: autodate("2026-01-04")
            }
        ]);

        expect(layout).toHaveLength(2);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;

        expect(task1.start).toEqual(new Date("2026-01-02"));
        expect(task1.end).toEqual(new Date("2026-01-03"));
        expect(task2.start).toEqual(new Date("2026-01-03"));
        expect(task2.end).toEqual(new Date("2026-01-04"));
    });

    test("dependency chains with no fixed points have default placement", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 2,
                due_by: ""
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 2,
                due_by: ""
            },
            {
                id: "3",
                created: autodate("2026-01-01"),
                dependencies: ["2"],
                duration_days: 2,
                due_by: ""
            }
        ]);

        expect(layout).toHaveLength(3);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;
        const task3 = layout.find(l => l.card.id === "3")!;
        
        expect(task1.start).toEqual(new Date("2026-01-01"));
        expect(task1.end).toEqual(new Date("2026-01-03"));
        expect(task2.start).toEqual(new Date("2026-01-03"));
        expect(task2.end).toEqual(new Date("2026-01-05"));
        expect(task3.start).toEqual(new Date("2026-01-05"));
        expect(task3.end).toEqual(new Date("2026-01-07"));
    });

    test("fixed durations in the middle of flex chains are respected", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 2,
                due_by: autodate("2026-01-05")
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 0,
                due_by: ""
            },
            {
                id: "3",
                created: autodate("2026-01-01"),
                dependencies: ["2"],
                duration_days: 3,
                due_by: ""
            },
            {
                id: "4",
                created: autodate("2026-01-01"),
                dependencies: ["3"],
                duration_days: 0, 
                due_by: autodate("2026-01-12")
            }
        ]);

        expect(layout).toHaveLength(4);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;
        const task3 = layout.find(l => l.card.id === "3")!;
        const task4 = layout.find(l => l.card.id === "4")!;

        expect(task1.start).toEqual(new Date("2026-01-03"));
        expect(task1.end).toEqual(new Date("2026-01-05"));
        expect(task2.start).toEqual(new Date("2026-01-05"));
        expect(task2.end).toEqual(new Date("2026-01-07")); // flex duration
        expect(task3.start).toEqual(new Date("2026-01-07"));
        expect(task3.end).toEqual(new Date("2026-01-10")); // fixed duration
        expect(task4.start).toEqual(new Date("2026-01-10"));
        expect(task4.end).toEqual(new Date("2026-01-12")); // flex duration
    });

    test("multiple dependencies chose the critical path", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 1,
                due_by: autodate("2026-01-04")
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 1,
                due_by: ""
            },
            {
                id: "3",
                created: autodate("2026-01-01"),
                dependencies: ["1", "2"],
                duration_days: 1,
                due_by: ""
            }
        ]);

        expect(layout).toHaveLength(3);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;
        const task3 = layout.find(l => l.card.id === "3")!;

        expect(task1.start).toEqual(new Date("2026-01-03"));
        expect(task1.end).toEqual(new Date("2026-01-04"));
        expect(task2.start).toEqual(new Date("2026-01-04"));
        expect(task2.end).toEqual(new Date("2026-01-05"));
        expect(task3.start).toEqual(new Date("2026-01-05"));
        expect(task3.end).toEqual(new Date("2026-01-06"));
    });

    test("flex works with multiple dependents", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-01"),
                dependencies: [],
                duration_days: 1,
                due_by: autodate("2026-01-05")
            },
            {
                id: "2",
                created: autodate("2026-01-01"),
                dependencies: ["1"],
                duration_days: 0,
                due_by: ""
            },
            {
                id: "3.1",
                created: autodate("2026-01-01"),
                dependencies: ["2"],
                duration_days: 1,
                due_by: autodate("2026-01-10")
            },
            {
                id: "3.2",
                created: autodate("2026-01-01"),
                dependencies: ["2"],
                duration_days: 2,
                due_by: autodate("2026-01-10")
            }
        ]);

        expect(layout).toHaveLength(4);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;
        const task3_1 = layout.find(l => l.card.id === "3.1")!;
        const task3_2 = layout.find(l => l.card.id === "3.2")!;

        expect(task1.start).toEqual(new Date("2026-01-04"));
        expect(task1.end).toEqual(new Date("2026-01-05")); // fixed
        expect(task2.start).toEqual(new Date("2026-01-05"));
        expect(task2.end).toEqual(new Date("2026-01-08")); // flex
        expect(task3_1.start).toEqual(new Date("2026-01-09"));
        expect(task3_1.end).toEqual(new Date("2026-01-10")); // fixed
        expect(task3_2.start).toEqual(new Date("2026-01-08"));
        expect(task3_2.end).toEqual(new Date("2026-01-10")); // fixed
    });

    test("multiple full paths flex", () => {
        const layout = layoutCardsToGantt([
            {
                id: "1",
                created: autodate("2026-01-08"),
                dependencies: [],
                duration_days: 1,
                due_by: autodate("2026-01-05")
            },
            {
                id: "2",
                created: autodate("2026-01-08"),
                dependencies: ["1"],
                duration_days: 0,
                due_by: ""
            },
            {
                id: "3.1",
                created: autodate("2026-01-08"),
                dependencies: ["2"],
                duration_days: 2,
                due_by: autodate("2026-01-10")
            },
            {
                id: "3.2",
                created: autodate("2026-01-08"),
                dependencies: ["2"],
                duration_days: 1,
                due_by: ""
            }
        ]);

        expect(layout).toHaveLength(4);
        const task1 = layout.find(l => l.card.id === "1")!;
        const task2 = layout.find(l => l.card.id === "2")!;
        const task3_1 = layout.find(l => l.card.id === "3.1")!;
        const task3_2 = layout.find(l => l.card.id === "3.2")!;

        expect(task1.start).toEqual(new Date("2026-01-04"));
        expect(task1.end).toEqual(new Date("2026-01-05")); // fixed
        expect(task2.start).toEqual(new Date("2026-01-05"));
        expect(task2.end).toEqual(new Date("2026-01-08")); // flex
        expect(task3_1.start).toEqual(new Date("2026-01-08"));
        expect(task3_1.end).toEqual(new Date("2026-01-10")); // fixed
        expect(task3_2.start).toEqual(new Date("2026-01-08"));
        expect(task3_2.end).toEqual(new Date("2026-01-09")); // fixed
    });
});