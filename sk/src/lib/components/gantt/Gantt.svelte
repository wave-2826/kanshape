<script lang="ts">
    import { Tag } from "lucide-svelte";
    import { onMount, tick, type Snippet } from "svelte";

	export type GanttItem = {
		id: string;
		name: string;
		start: Date;
		end: Date;
        due?: Date;
		color?: string;
	};
    export type GanttCategory = {
        name: string;
        color?: string;
        items: GanttItem[];
    };

	const {
		categories,
        onclickitem,
        cornerHeader
	}: {
		categories: GanttCategory[];
        onclickitem?: ((id: string) => void);
        cornerHeader?: Snippet;
	} = $props();

    const items = $derived.by(() => {
        const result: GanttItem[] = [];
        for(const category of categories) {
            for(const item of category.items) {
                result.push(item);
            }
        }
        return result;
    });

	let dateRange = $derived.by(() => {
		if(items.length === 0) {
			const now = new Date();
			return {
				start: new Date(now.getFullYear(), now.getMonth(), 1),
				end: new Date(now.getFullYear(), now.getMonth() + 2, 0)
			};
		}
		let min = new Date(items[0].start);
		let max = new Date(items[0].end);
		for(const item of items) {
			if(item.start < min) min = new Date(item.start);
			if(item.end > max) max = new Date(item.end);
		}
        
		// Add ~20% padding on each side plus a day
		const rangeMs = max.getTime() - min.getTime();
		const padMs = Math.max(rangeMs * 0.2, 24 * 60 * 60 * 1000);
        function snapDate(date: Date): Date {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d;
        }
		return {
			start: snapDate(new Date(min.getTime() - padMs)),
			end: snapDate(new Date(max.getTime() + padMs))
		};
	});

	// day columns
	let days = $derived.by(() => {
		const result: Date[] = [];
		const current = new Date(dateRange.start);
		while(current <= dateRange.end) {
			result.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}
		return result;
	});

	// month header labels
	let months = $derived.by(() => {
		const result: { label: string; startDay: number; span: number }[] = [];
		let currentMonth = -1;
		let currentYear = -1;
		for(let i = 0; i < days.length; i++) {
			const d = days[i];
			if(d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
				if(result.length > 0) {
					result[result.length - 1].span = i - result[result.length - 1].startDay;
				}
				result.push({
					label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
					startDay: i,
					span: 0
				});
				currentMonth = d.getMonth();
				currentYear = d.getFullYear();
			}
		}
		if(result.length > 0) {
			result[result.length - 1].span = days.length - result[result.length - 1].startDay;
		}
		return result;
	});

	let todayDays = $derived.by(() => {
		const now = new Date();
		if(now < dateRange.start || now > dateRange.end) return -1;
		return (now.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
	});

	function barStyle(item: GanttItem): string {
		const startDay = (item.start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
        const endDay = (item.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
		return `--start-day: ${startDay}; --end-day: ${endDay}; --bar-color: ${item.color ?? "var(--category-color)"}`;
	}

	function dayLabel(d: Date): string {
		return d.toLocaleDateString(undefined, { day: "numeric" });
	}

	function isWeekend(d: Date): boolean {
		return d.getDay() === 0 || d.getDay() === 6;
	}

	function isToday(d: Date): boolean {
		const now = new Date();
		return d.getFullYear() === now.getFullYear()
			&& d.getMonth() === now.getMonth()
			&& d.getDate() === now.getDate();
	}

    let scrollContainer: HTMLElement | null = null;
    onMount(async () => {
        if(!scrollContainer) return;
        if(todayDays >= 0) {
            const originalMarginLeft = scrollContainer.style.marginLeft;
            const originalMarginRight = scrollContainer.style.marginRight;

            // we can't use getComputedStyle directly on custom properties, so we tell
            // CSS it's a size with the hackiest code i've ever written. yeah. not proud of this.
            scrollContainer.style.marginLeft = "var(--day-width)";
            scrollContainer.style.marginRight = "var(--label-width)";
            const dayWidth = parseFloat(getComputedStyle(scrollContainer).marginLeft);
            const labelWidth = parseFloat(getComputedStyle(scrollContainer).marginRight);
            scrollContainer.style.marginLeft = originalMarginLeft;
            scrollContainer.style.marginRight = originalMarginRight;

            const pos = todayDays * dayWidth + labelWidth;
            const scroll = pos - scrollContainer.clientWidth / 2;
            scrollContainer.scrollLeft = Math.max(0, Math.min(scroll, scrollContainer.scrollWidth - scrollContainer.clientWidth));
        }
    });
</script>

<div class="gantt" style="--day-count: {days.length}" bind:this={scrollContainer}>
    {#if items.length === 0}
        <div class="empty">
            <p>No tasks to display.</p>
        </div>
    {:else}
        <div class="content">
            <div class="header label-col">
                {@render cornerHeader?.()}
            </div>
            <div class="header timeline">
                <div class="months">
                    {#each months as month}
                        <div class="month" style="--start: {month.startDay}; --span: {month.span}">
                            {month.label}
                        </div>
                    {/each}
                </div>
                <div class="days">
                    {#each days as day, i}
                        <div
                            class="day"
                            class:weekend={isWeekend(day)}
                            class:today={isToday(day)}
                        >
                            {dayLabel(day)}
                        </div>
                    {/each}
                </div>
            </div>

            <div class="body">
                {#if todayDays >= 0}
                    <div class="today-bar" style="--pos: {todayDays}"></div>
                {/if}
                {#each categories as category, i (i)}
                    {@const categoryColors = ["#ff6e64", "#ffb473", "#ffdc73", "#deff73", "#73ff9e", "#73fff0", "#73b3ff", "#b473ff", "#ff73f0"]}
                    <div class:category={category.name !== ""} style="--category-color: {category.color ?? categoryColors[i % categoryColors.length]}">
                        {#if category.name !== ""}
                            <span class="label-col category-label"><Tag />{category.name}</span>
                        {/if}
                        {#each category.items as item (item.id)}
                            <div class="row">
                                <div class="label-col" title={item.name}>
                                    <span class="label">{item.name}</span>
                                </div>
                                <div class="timeline">
                                    <button
                                        style={barStyle(item)}
                                        title={`${item.name}: ${item.start.toLocaleDateString()} - ${item.end.toLocaleDateString()}`}
                                        onclick={() => onclickitem?.(item.id)}
                                    >
                                        <span class="label">{item.name}</span>
                                    </button>
                                    {#if item.due}
                                        <div class="due-date" style="--pos: {(item.due.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)}"></div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
.gantt {
    --day-width: 2rem;
    --label-width: 160px;
    
    flex: 1;
    min-height: 0;

	overflow: auto;
	font-size: var(--font-small);
	user-select: none;
    overscroll-behavior: none;

    padding: 0 0.5rem 5rem 0;
    margin: 0 0 0 0.5rem;

	position: relative;

    .content {
        display: inline-grid;
        grid-template-columns: var(--label-width) 1fr;
        grid-template-rows: auto 1fr;
        grid-template-areas:
            "corner header"
            "body body";
        
        border-radius: 4px;
    }
}

.empty {
	padding: 1rem;
	text-align: center;
	color: var(--text-tertiary);
}

.header.label-col {
    z-index: 4;
    top: 0;
    grid-area: corner;
    // this doesn't quite work with sticky elements under it but i've decided to ignore it
    // because i can't care enough at this point
    border-top-left-radius: 4px;
    padding-left: 0.25rem;
}
.header.timeline {
    z-index: 3;
    position: sticky;
    top: 0;
    grid-area: header;
    background-color: var(--bg-primary);
    border-top-right-radius: 4px;

    .months {
        display: grid;
        grid-template-columns: repeat(var(--day-count), var(--day-width));
    }
    
    .month {
        grid-column: calc(var(--start) + 1) / span var(--span);
        padding: 0.2em 0.35em;
        font-size: var(--font-tiny);
        font-weight: 600;
        color: var(--text-secondary);
        text-align: center;
        overflow: hidden;
        white-space: nowrap;

        &:not(:last-child) {
            border-right: 1px solid var(--border);
        }
    }
}

.timeline {
	position: relative;
    flex: 1;
}

.days {
	display: grid;
	grid-template-columns: repeat(var(--day-count), var(--day-width));
    
    .day {
        padding: 0.15em 0;
        text-align: center;
        font-size: var(--font-tiny);
        color: var(--text-tertiary);

        &:not(:last-child) {
            border-right: 1px solid var(--border);
        }

        &.today {
            color: var(--accent);
            font-weight: 600;
        }
    }
}

.body {
	display: flex;
	flex-direction: column;
    grid-area: body;
    position: relative;
    border-radius: 0 0 4px 4px;
    contain: paint;
}

.row {
	display: flex;
	border-bottom: 1px solid var(--bg-secondary);
	min-height: 2rem;

	&:last-child {
		border-bottom: none;
	}

	&:hover {
		background-color: color-mix(in srgb, var(--accent) 3%, transparent);
	}
}

button {
	position: absolute;
	top: 3px;
	bottom: 3px;
	border-top: 1px solid var(--bar-color);
    
    left: calc(var(--start-day) * 100% / var(--day-count));
    width: calc((var(--end-day) - var(--start-day)) * 100% / var(--day-count));

    min-width: 4px;
	z-index: 1;
	
    .label {
        padding: 0 0.35em;
        font-size: var(--font-tiny);
        color: #fff;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.label-col {
	width: 160px;
	min-width: 0;
	padding: 0.35em 0.5em;
	display: flex;
	align-items: center;
	overflow: hidden;
	background-color: var(--bg-primary);

    position: sticky;
    z-index: 3;
    left: 0;

    padding-left: 0.75rem;

    &.category-label {
        color: var(--text-primary);

        border-left: 1px solid var(--category-color);

        > :global(svg) {
            width: 0.75rem;
            height: 0.75rem;
            margin-right: 0.25rem;
        }
    }
}

.category {
    position: relative;
}
.category::before {
    content: "";
    position: absolute;
    top: 0.75rem;
    left: 0;
    right: 0;
    border-top: 1px dotted color-mix(var(--category-color), transparent 30%);
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-tiny);
	color: var(--text-secondary);
}

.today-bar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(var(--pos) * var(--day-width) + var(--label-width));
    border-right: 1px solid var(--accent);
    z-index: 2;
    pointer-events: none;
}

.due-date {
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(var(--pos) * var(--day-width));
    border-right: 1.5px dashed var(--error);
    pointer-events: none;
}
</style>