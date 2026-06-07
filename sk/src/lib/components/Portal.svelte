<!--
    Adapted for Svelte 5 from https://github.com/romkor/svelte-portal/.
    A portal component moves its children to a different place in the DOM, useful for things like
    popovers or modals that need to escape overflow:hidden or z-index contexts.  
    Note that this messes with Svelte styles - scoped styles still work, but they can't be nested.
-->

<script lang="ts" module>
    import { tick, type Snippet } from "svelte";
    
    /**
     * Usage: <div use:portal={'css selector'}> or <div use:portal={document.body}>
     */
    export function portal(el: HTMLElement, target: HTMLElement | string = "body") {
        let targetEl;

        async function update(newTarget: HTMLElement | string) {
            target = newTarget;
            if(typeof target === "string") {
                targetEl = document.querySelector(target);
                if(targetEl === null) {
                    await tick();
                    targetEl = document.querySelector(target);
                }
                if(targetEl === null) throw new Error(`No element found matching css selector: "${target}"`);
            } else if(target instanceof HTMLElement) {
                targetEl = target;
            } else {
                throw new TypeError(`Unknown portal target type: ${target === null ? "null" : typeof target}. Allowed types: string (CSS selector) or HTMLElement.`);
            }
            targetEl.appendChild(el);
            el.hidden = false;
        }
        
        function destroy() {
            if(el.parentNode) el.parentNode.removeChild(el);
        }
        
        update(target);

        return {
            update,
            destroy,
        };
    }
</script>

<script lang="ts">
    const {
        /** DOM Element or CSS Selector */
        target = "body",
        children
    }: {
        target: HTMLElement | string,
        children: Snippet
    } = $props();
</script>

<div use:portal={target} hidden>
    {@render children()}
</div>