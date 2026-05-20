<!-- Simple relative time text that updates automatically -->
<!-- TODO: This will get messed up on second countdowns since it only updates every minute but... whatever. -->
<!-- might be fun to fix w/o a higher update interval though! -->

<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { relativeTime } from "$lib/datetime";

    const { date }: { date: Date } = $props();

    let timeString = $derived(relativeTime(date));
    let interval: number;

    function update() {
        timeString = relativeTime(date);
    }

    onMount(() => {
        interval = setInterval(update, 60 * 1000); // update every minute
    });

    onDestroy(() => {
        clearInterval(interval);
    });
</script>

{timeString}