<script lang="ts">
    import { client } from "$lib/pocketbase";
    import type { ChangeEventHandler } from "svelte/elements";

    let {
        id,
        value = $bindable(),
        onchange
    }: {
        /** id of the select element*/
        id?: string,
        value: string,
        onchange?: ChangeEventHandler<HTMLSelectElement>
    } = $props();

    const list = client.collection("users").listAuthMethods();
</script>

<select bind:value onchange={onchange} {id}>
    {#await list}
        <option value="">Loading auth methods...</option>
    {:then methods}
        <option value="">None</option>
        {#each methods.oauth2.providers as provider}
            <option value={provider.name}>{provider.displayName || provider.name}</option>
        {/each}
    {:catch}
        <option value="">Error loading auth methods.</option>
    {/await}
</select>