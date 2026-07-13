<script lang="ts">
    import { relativeTime } from "$lib/datetime";
    import { Check, CheckCheck, Clock, ListCheck } from "lucide-svelte";

    const {
        cardCount,
        finishedCardCount,
        overdueCardCount,
        nextDue
    }: {
        cardCount: number,
        finishedCardCount: number,
        overdueCardCount: number,
        nextDue: string | null
    } = $props();
</script>

<div class="horizontal-list overview">
    <div class="overview-item">
        <h3><ListCheck /> Cards</h3>
        <p>{cardCount}</p>
    </div>
    <div class="overview-item">
        <h3><CheckCheck /> Finished cards</h3>
        <p class="finished">{finishedCardCount}</p>
    </div>
    <div class="overview-item">
        <h3><Clock /> Overdue cards</h3>
        <p class:overdue={overdueCardCount > 0}>{overdueCardCount}</p>
    </div>
    {#if nextDue !== null}
        <div class="overview-item">
            <!-- TODO: should definitely link to the card -->
            <h3><Check /> Next due</h3>
            <p>{relativeTime(new Date(nextDue))}</p>
        </div>
    {/if}
</div>

<label class="progress-label">
    <progress value={finishedCardCount} max={Math.max(1, cardCount)}></progress>
    {cardCount > 0 ? Math.round(finishedCardCount / cardCount * 100) : 0}% complete
</label>

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "../../overview.scss";

.overview {
    padding-left: 0;
}
.overview-item {
    background-color: var(--bg-primary);
    padding: 0.5rem 0.5rem 0.75rem 0.5rem;
    border-radius: 4px;
    width: 10rem;
    text-align: center;

    h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: var(--font-small);
        color: var(--text-secondary);
    }

    p {
        margin-top: 0.5rem;
        font-size: var(--font-large);
        font-weight: bold;
        color: var(--text-primary);

        &.overdue {
            color: var(--error);
        }
        &.finished {
            color: var(--success);
        }
    }
}

.progress-label {
    margin-top: 0.25rem;
    gap: 1rem;
    width: 100%;
    padding: 0 0.75rem 0 0.125rem; // intentionally misalign for visual balance
    font-size: var(--font-small);
    color: var(--text-secondary);
}
</style>