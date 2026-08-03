<script lang="ts">
    import { Loader } from "@lucide/svelte";

    const { class: _class }: { class?: string } = $props();
</script>

<!--
    A lightly-animated lucide spinner icon to show loading states. Doesn't animate if
    the user has prefers-reduced-motion enabled.
-->

<Loader class={[$css("spinner"), _class]} />

<style lang="scss">
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
    @media (prefers-reduced-motion: no-preference) {
        .spinner {
            animation: spin 1.5s ease-in-out infinite;
        }
    }
</style>