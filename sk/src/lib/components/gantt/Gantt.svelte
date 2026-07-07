<script lang="ts">
	/**
	 * A barebones Gantt chart for displaying tasks along a time axis.
	 * Items are rendered as horizontal bars positioned by their start/end dates.
	 */

	type GanttItem = {
		id: string;
		name: string;
		start: Date;
		end: Date;
		color?: string;
	};

	const {
		items,
        onclickitem
	}: {
		items: GanttItem[];
        onclickitem?: ((id: string) => void);
	} = $props();

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
        
		// Add ~10% padding on each side
		const rangeMs = max.getTime() - min.getTime();
		const padMs = Math.max(rangeMs * 0.1, 24 * 60 * 60 * 1000);
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

	let todayPercent = $derived.by(() => {
		const now = new Date();
		if (now < dateRange.start || now > dateRange.end) return -1;
		const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
		return ((now.getTime() - dateRange.start.getTime()) / totalMs) * 100;
	});

	function barStyle(item: GanttItem): string {
		const startDay = (item.start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
        const endDay = (item.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
		return `--start-day: ${startDay}; --end-day: ${endDay}; --bar-color: ${item.color ?? "var(--accent)"}`;
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
</script>

<div class="gantt" style="--day-count: {days.length}">
    <div class="content">
        {#if items.length === 0}
            <div class="empty">
                <p>No tasks to display.</p>
            </div>
        {:else}
            <header>
                <div class="label-col"></div>
                <div class="timeline">
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
            </header>

            <div class="body">
                {#each items as item (item.id)}
                    <div class="row">
                        <div class="label-col" title={item.name}>
                            <span class="label">{item.name}</span>
                        </div>
                        <div class="timeline">
                            {#if todayPercent >= 0}
                                <div class="today-bar" style="left: {todayPercent}%"></div>
                            {/if}
                            <button
                                style={barStyle(item)}
                                title={`${item.name}: ${item.start.toLocaleDateString()} - ${item.end.toLocaleDateString()}`}
                                onclick={() => onclickitem?.(item.id)}
                            >
                                <span class="label">{item.name}</span>
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
.gantt {
    --day-width: 2rem;
    
    flex: 1;
    min-height: 0;

	overflow: auto;
	font-size: var(--font-small);
	user-select: none;

    padding: 0 0.5rem 5rem 0;
    margin: 0 0 0 0.5rem;

    .content {
        display: inline-flex;
        flex-direction: column;
    }
}

.empty {
	padding: 2rem;
	text-align: center;
	color: var(--text-tertiary);
}

header {
	display: flex;
	position: sticky;
	top: 0;
	z-index: 3;
    border-radius: 4px 4px 0 0;
	background-color: var(--bg-primary);
    
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

    .label-col {
        background-color: transparent;
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
    border-radius: 0 0 4px 4px;
    contain: content;
}

.row {
	display: flex;
	border-bottom: 1px solid var(--bg-secondary);
	min-height: 2.25rem;

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
    width: 1px;
    background-color: var(--error);
    z-index: 2;
    pointer-events: none;
    opacity: 0.6;
}
</style>