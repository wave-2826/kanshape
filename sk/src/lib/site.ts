/** Global state related to the displayed site. */

import { writable } from "svelte/store";

/** Writable store for per-page metadata */
export const metadata = writable({
    title: "Home"
});

export type Alert = {
    severity: "info" | "warning" | "error";
    title?: string;
    text: string;
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
