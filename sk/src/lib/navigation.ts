import { goto } from "$app/navigation";

const alwaysKeepParams = ["documentId"];

export async function nav(path: string, options?: Parameters<typeof goto>[1] & {
    /** Parameters for the navigation target */
    params?: Record<string, string>,
    /** A list of query parameters to maintain from the current URL */
    keepParams?: string[]
}) {
    const url = new URL(path, window.location.origin);

    const paramsToKeep = options?.keepParams ?? [];
    const currentParams = new URLSearchParams(window.location.search);
    for(const param of [...alwaysKeepParams, ...paramsToKeep]) {
        const value = currentParams.get(param);
        if(value) url.searchParams.set(param, value);
    }

    if(options?.params) {
        for(const [key, value] of Object.entries(options.params)) {
            url.searchParams.set(key, value);
        }
    }

    await goto(url.pathname + url.search, options);
}