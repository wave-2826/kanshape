import { page } from "$app/state";
import { pushState } from "$app/navigation";
import { untrack } from "svelte";

/**
 * A sketchy state management nightmare for creating reactive state for the open card that
 * synchronizes with the URL query parameter "card" and enables shallow routing.
 */
export class OpenCardState {
    private _cardId = $state<string | null>(null);
    private callback: ((cardId: string | null) => void) | null = null;
    private parent: OpenCardState | null;
    private beforeSet: ((cardId: string | null) => boolean) | null;

    constructor(
        defaultValue: string | null = null,
        parent: OpenCardState | null = null,
        beforeSet: ((cardId: string | null) => boolean) | null = null
    ) {
        this._cardId = defaultValue;
        this.parent = parent;
        this.beforeSet = beforeSet;

        if(!this.parent) {
            $effect.pre(() => {
                page.url.searchParams.get("card"); // for reactivity

                // for some reason page.url doesn't update yet here, so we get the url ourself
                const fromUrl = new URL(location.href).searchParams.get("card");
                untrack(() => {
                    if(fromUrl !== this._cardId) this._cardId = fromUrl;
                });
            });
        }
    }

    get cardId() {
        return this.parent ? this.parent.cardId : this._cardId;
    }

    set cardId(value: string | null) {
        if(value === this.cardId) return;

        if(this.parent) {
            if(this.beforeSet && !this.beforeSet?.(value)) return;
            
            this.parent.cardId = value;
            return;
        }

        this.set(value);
    }

    /** Add a listener for the next selection and skip setting the next time. Used for selecting dependencies. */
    addListenerForSelection(cb: (cardId: string | null) => void) {
        if(this.parent) {
            this.parent.addListenerForSelection(cb);
            return;
        }

        this.callback = cb;
    }

    /**
     * A callback that runs before the card is set. Return false from it to prevent setting the card.
     */
    withBeforeSet(cb: (cardId: string | null) => boolean): OpenCardState {
        return new OpenCardState(null, this, cb);
    }

    private set(value: string | null) {
        if(this.callback) {
            this.callback(value);
            this.callback = null;
            return;
        }

        this._cardId = value;

        const url = new URL(page.url);
        if(value) url.searchParams.set("card", value);
        else url.searchParams.delete("card");

        pushState(url, page.state);
    }
}

export function createOpenCardState(defaultValue: string | null = null): OpenCardState {
    return new OpenCardState(defaultValue);
}