<script lang="ts">
    import { balanceText } from "$lib/actions";
    import { alerts, showAlert } from "$lib/site";
    import { X } from "@lucide/svelte";
    import { fly, slide } from "svelte/transition";
</script>

<!-- for testing -->
<!-- <svelte:window onkeydown={(e) => {
    if(e.key === "a") {
        const type = (["info", "warning", "error"] as const)[Math.floor(Math.random() * 3)];
        showAlert({
            text: `This is a test ${type} alert with a loooooooooooooooooot of text omg so much teeeeeeeeeeext.`,
            severity: type
        });
    }
}} /> -->

<div class="alerts">
    {#each $alerts as alert (alert.id)}
        <!-- nested elements so we can use two transitions lol -->
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -
             we're okay with this because there's an identical action on the button inside
        -->
        <div
            aria-label="{alert.title} {alert.text}"
            role="alert"
            transition:slide={{ duration: 200, axis: "y" }}
            onclick={() => alerts.update(a => a.filter((a) => a.id !== alert.id))}
        >
            <div class="alert {alert.severity}" transition:fly={{ duration: 200, x: 100 }}>
                <button class="close" aria-label="Close" onclick={() => alerts.update(a =>
                    a.filter((a) => a.id !== alert.id)
                )}><X /></button>
                {#if alert.title}
                    <span class="title">{alert.title}</span>
                {/if}
                <span class="text" use:balanceText>{alert.text}</span>
            </div>
        </div>
    {/each}
</div>

<style lang="scss">
.alerts {
    position: absolute;
    bottom: 0;
    right: 0;
    margin: 1rem;

    display: flex;
    flex-direction: column;
    align-items: end;
    gap: 0.5rem;

    pointer-events: none;

    z-index: 10000;
}
.alert {
    pointer-events: auto;

    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    position: relative;

    padding: 0.75rem;
    background-color: var(--bg-secondary);
    border-radius: 4px;
    box-shadow: 0 0 var(--shadow);
    max-width: min(50vw, 400px);
    word-break: break-word;

    &.info { border-top: 1px solid var(--accent); }
    &.warning { border-top: 1px solid var(--warning-medium); }
    &.error { border-top: 1px solid var(--error); }

    .title {
        font-weight: bold;
    }

    .close {
        color: var(--text-secondary);
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        opacity: 0;
        transition: opacity 200ms ease;
    }
    &:hover .close {
        opacity: 1;
    }
}
</style>