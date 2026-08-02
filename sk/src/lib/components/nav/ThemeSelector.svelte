<script lang="ts">
    import { Moon, Sun, SunMoon } from "lucide-svelte";

    const STORAGE_KEY = "theme";
    type Theme = "system" | "light" | "dark";

    function readStored(): Theme {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === "light" || stored === "dark" || stored === "system"
            ? stored
            : "system";
    }

    function apply(theme: Theme) {
        const root = document.documentElement;
        if (theme === "system") {
            root.removeAttribute("data-theme");
        } else {
            root.setAttribute("data-theme", theme);
        }
    }

    let theme = $state<Theme>(readStored());
    // svelte-ignore state_referenced_locally
    apply(theme);

    function select(next: Theme) {
        theme = next;
        localStorage.setItem(STORAGE_KEY, next);

        if(document.startViewTransition) {
            document.startViewTransition(() => apply(next));
        } else {
            apply(next);
        }
    }
</script>

<div class="themes" role="group" aria-label="Theme">
    <button
        class:selected={theme === "system"}
        onclick={() => select("system")}
        aria-pressed={theme === "system"}
        aria-label="Use system theme"
        title="Use system theme"
    ><SunMoon /></button>
    <button
        class:selected={theme === "light"}
        onclick={() => select("light")}
        aria-pressed={theme === "light"}
        aria-label="Use light theme"
        title="Use light theme"
    ><Sun /></button>
    <button
        class:selected={theme === "dark"}
        onclick={() => select("dark")}
        aria-pressed={theme === "dark"}
        aria-label="Use dark theme"
        title="Use dark theme"
    ><Moon /></button>
</div>

<style lang="scss">
.themes {
    display: flex;
    gap: 0.5rem;

    button {
        padding: 0.25rem;
    }
}
</style>