import { page } from "$app/state";
import { pushState } from "$app/navigation";
import { untrack } from "svelte";

/**
 * A sketchy state management nightmare for creating reactive state for the open card that
 * synchronizes with the URL query parameter "card" and enables shallow routing.
 */
export function createOpenCardState(defaultValue: string | null = null) {
    let cardId = $state(defaultValue);

    function set(value: string | null) {
        if(value === cardId) return;

        cardId = value;

        const url = new URL(page.url);
        if(value) url.searchParams.set("card", value);
        else url.searchParams.delete("card");

        pushState(url, page.state);
    }

    $effect.pre(() => {
        page.url.searchParams.get("card"); // for reactivity

        // for some reason page.url doesn't update yet here, so we get the url ourself
        const fromUrl = new URL(location.href).searchParams.get("card");
        untrack(() => {
            if(fromUrl !== cardId) cardId = fromUrl;
        });
    });

    return {
        get cardId() {
            return cardId;
        },
        set cardId(value: string | null) {
            set(value);
        }
    };
}