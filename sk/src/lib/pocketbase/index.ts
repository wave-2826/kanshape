import PocketBase from "pocketbase";
import type {
    ListResult,
    RecordFullListOptions,
    RecordListOptions,
    RecordModel,
    UnsubscribeFunc,
} from "pocketbase";
import { readable, type Readable, type Subscriber } from "svelte/store";
import { browser } from "$app/environment";
import { base } from "$app/paths";
import { Collections, type CollectionRecords, type TypedPocketBase } from "./generated-types";

export const client = new PocketBase(
    browser ? window.location.origin + base : undefined
) as TypedPocketBase;

/**
 * Save (create/update) a record (a plain object). Automatically converts to
 * FormData if needed.
 */
export async function save<T>(
    collectionName: Collections | string, record: any, create = false,
    fetch: typeof window.fetch = window.fetch
): Promise<T> {
    // convert obj to FormData in case one of the fields is instanceof FileList
    const data = objectToFormData(record);
    if(record.id && !create) {
        // "create" flag overrides update
        return await client.collection(collectionName).update<T>(record.id, data, { fetch });
    } else {
        return await client.collection(collectionName).create<T>(data, { fetch });
    }
}

// Convert obj to FormData in case one of the fields is instanceof FileList
function objectToFormData(obj: {}) {
    // check if any field's value is an instanceof FileList
    if(!Object.values(obj).some(
        (val) => val instanceof FileList || val instanceof File
    )) {
        // if not, just return the original object
        return obj;
    }
    // otherwise, build FormData (multipart/form-data) from obj
    const fd = new FormData();
    for(const [key, val] of Object.entries(obj)) {
        if(val instanceof FileList) {
            for(const file of val) {
                fd.append(key, file);
            }
        } else if(val instanceof File) {
            // handle File before "object" so that it doesn't get serialized as JSON
            fd.append(key, val);
        } else if(Array.isArray(val)) {
            // for some reason, multipart/form-data wants arrays to be comma-separated strings
            fd.append(key, val.join(","));
        } else if(typeof val === "object") {
            fd.append(key, JSON.stringify(val));
        } else {
            fd.append(key, val as any);
        }
    }
    return fd;
}

export interface PageStore<T = any> extends Readable<ListResult<T>> {
    setPage(newpage: number): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
}

export async function watch<T extends RecordModel>(
    collectionName: Collections | string,
    queryParams = {} as RecordListOptions,
    page = 1,
    perPage = 20,
    realtime = browser
): Promise<PageStore<T>> {
    const collection = client.collection(collectionName);
    let result = await collection.getList<T>(page, perPage, queryParams);
    let set: Subscriber<ListResult<T>>;
    let unsubRealtime: UnsubscribeFunc | undefined;
    // fetch first page
    const store = readable<ListResult<T>>(result, (_set) => {
        set = _set;
        // watch for changes (only if you're in the browser)
        if(realtime) collection.subscribe<T>(
            "*",
            ({ action, record }) => {
                (async function (action: string) {
                    // see https://github.com/pocketbase/pocketbase/discussions/505
                    switch (action) {
                        // ISSUE: no subscribe event when a record is modified and no longer fits the "filter"
                        // @see https://github.com/pocketbase/pocketbase/issues/4717
                        case "update":
                        case "create":
                            // record = await expand(queryParams.expand, record);
                            const index = result.items.findIndex( (r) => r.id === record.id);
                            // replace existing if found, otherwise append
                            if(index >= 0) {
                                result.items[index] = record;
                                return result.items;
                            } else {
                                return [...result.items, record];
                            }
                        case "delete":
                            return result.items.filter((item) => item.id !== record.id);
                    }
                    return result.items;
                })(action).then((items) => set((result = { ...result, items })));
            },
            queryParams
        )
        // remember for later
        .then((unsub) => (unsubRealtime = unsub));
    });

    async function setPage(newpage: number) {
        const { page, totalPages, perPage } = result;
        if(page > 0 && page <= totalPages) {
            set((result = await collection.getList(newpage, perPage, queryParams)));
        }
    }

    return {
        ...store,
        subscribe(run, invalidate) {
            const unsubStore = store.subscribe(run, invalidate);
            return async () => {
                unsubStore();
                // ISSUE: Technically, we should AWAIT here, but that will slow down navigation UX.
                if(unsubRealtime) /* await */ unsubRealtime();
            };
        },
        setPage,
        async next() {
            setPage(result.page + 1);
        },
        async prev() {
            setPage(result.page - 1);
        },
    };
}

export async function query<C extends Collections | string>(
    collectionName: C,
    queryParams = {} as RecordFullListOptions
): Promise<(C extends Collections ? CollectionRecords[C] : any)[]> {
    const collection = client.collection(collectionName);
    return await collection.getFullList(queryParams);
}