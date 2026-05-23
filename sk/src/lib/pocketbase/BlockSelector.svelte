<script lang="ts">
    const {
        values,
        onchange,
        collection
    }: {
        values: { id: string, name: string }[],
        onchange: (ids: string[]) => void,
        collection: string
    } = $props();
</script>

<!-- TODO -->