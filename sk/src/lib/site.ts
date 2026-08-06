/** Global state related to the displayed site. */

import { writable } from "svelte/store";

/** Writable store for per-page metadata */
export const metadata = writable({
    title: "Home"
});

export type Alert = {
    severity: "info" | "warning" | "error";
    /**
     * An optional title.
     * Good practice is for the title to display the _result_ of an issue in a few words without
     * punctuation and the text to show the specific issue.
     */
    title?: string;
    /**
     * Alerts should almost always have text unless they optionally show it for extra details.  
     * If an alert only has one line, use text instead of title.
     */
    text?: string;
    /** If an alert is persistent, it must be dismissed manually. Doesn't persist across page loads. */
    persistent?: boolean;
};
export const alerts = writable<(Alert & { id: number })[]>([]);
let nextAlertId = 0;
export function showAlert(alert: Alert) {
    const id = nextAlertId++;
    alerts.update(a => {
        a.push({ ...alert, id });
        return a;
    });

    if(!alert.persistent) setTimeout(() => {
        alerts.update(a => a.filter((a) => a.id !== id));
    }, 5000);
}
