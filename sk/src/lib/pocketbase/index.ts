import PocketBase from "pocketbase";
import type {
    BatchRequestResult,
    BatchService,
    ListResult,
    RecordFullListOptions,
    RecordListOptions,
    RecordModel,
    UnsubscribeFunc,
} from "pocketbase";
import { readable, type Readable, type Subscriber } from "svelte/store";
import { browser } from "$app/environment";
import { base } from "$app/paths";
import { Collections, type BaseSystemFields, type CollectionRecords, type CollectionResponses, type TypedPocketBase } from "./generated-types";

export const client = new PocketBase(
    browser ? window.location.origin + base : undefined
) as TypedPocketBase;

/**
 * Add a comma-separated expand list like `foo,bar` to the expand result of a returned query
 */
export type ExpandResponse<T extends {
	id: string
	collectionId: string
	collectionName: Collections
}, Expand extends string> = T & { expand: GetExpand<Expand> };

export type ExpandedRecord<K extends keyof CollectionRecords> = undefined | CollectionRecords[K] | CollectionRecords[K][];

type GetExpand<Expand extends string> = Expand extends `${infer Key},${infer Rest}`
    ? Key extends keyof CollectionRecords
        ? { [K in Key]: ExpandedRecord<K> } & GetExpand<Rest>
        : GetExpand<Rest>
    : Expand extends keyof CollectionRecords
        ? { [K in Expand]: ExpandedRecord<Expand> }
        : {};

/**
 * The PocketBase SDK returns expanded records as either undefined, T, or T[], depending on the relation type and
 * whether there are any assigned. This function normalizes the result to always be an array of T.
 */
export function cannonicalizeExpand<K extends keyof CollectionRecords>(expand: ExpandedRecord<K>): CollectionRecords[K][] {
    if(expand === undefined) return [];
    if(Array.isArray(expand)) return expand;
    return [expand];
}

export async function batch(run: (batch: BatchService) => Promise<void>): Promise<BatchRequestResult[]> {
    const batch = client.createBatch();
    await run(batch);
    return await batch.send();
}

/**
 * Save (create/update) a record (a plain object) in a batch. Automatically converts to
 * FormData if needed.
 * @param collectionName The name of the collection to save the record in.
 * @param record The record to save (create/update).
 * @param batch The batch to add the save operation to.
 * @param options Options for the save operation.
 */
export async function saveBatch<C extends Collections | string>(
    collectionName: C,
    record: Partial<C extends Collections ? CollectionRecords[C] : RecordModel>,
    batch: BatchService,
    options?: {
        create?: boolean,
        fetch?: typeof window.fetch
    }
) {
    // convert obj to FormData in case one of the fields is instanceof FileList
    const data = objectToFormData(record);
    if(!options?.create && record["id"]) {
        // "create" flag overrides update
        batch.collection(collectionName).update(record.id, data, { fetch: options?.fetch });
    } else {
        batch.collection(collectionName).create(data, { fetch: options?.fetch });
    }
}

/**
 * Save (create/update) a record (a plain object). Automatically converts to
 * FormData if needed.
 * @param collectionName The name of the collection to save the record in.
 * @param record The record to save (create/update).
 * @param options Options for the save operation.
 * @returns The saved record.
 */
export async function save<
    C extends Collections | string,
    Response extends C extends Collections ? CollectionResponses[C] : RecordModel
>(
    collectionName: C,
    record: Partial<C extends Collections ? CollectionRecords[C] : RecordModel>,
    options?: {
        create?: boolean,
        fetch?: typeof window.fetch
    }
): Promise<Response> {
    // convert obj to FormData in case one of the fields is instanceof FileList
    const data = objectToFormData(record);
    if(!options?.create && record["id"]) {
        // "create" flag overrides update
        return await client.collection(collectionName).update<Response>(
            record.id,
            data,
            { fetch: options?.fetch }
        );
    } else {
        return await client.collection(collectionName).create<Response>(
            data,
            { fetch: options?.fetch }
        );
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

export async function watchOne<
    C extends Collections | string,
    Expand extends string = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<CollectionResponses[C], Expand> : RecordModel
>(
    collectionName: C,
    recordId: string,
    queryParams = {} as RecordListOptions & { expand?: Expand },
    realtime = browser
): Promise<Readable<T>> {
    const collection = client.collection(collectionName);
    let result = await collection.getOne<T>(recordId, queryParams);

    let set: Subscriber<T>;
    let unsubRealtime: UnsubscribeFunc | undefined;
    // fetch first page
    const store = readable<T>(result, (_set) => {
        set = _set;
        // watch for changes (only if you're in the browser)
        if(realtime) collection.subscribe<T>(
            recordId,
            ({ action, record }) => {
                (async function (action) {
                    switch(action) {
                        case "update":
                            return record;
                        case "delete":
                            return undefined as any;
                    }
                    return result;
                })(action).then((record) => set((result = record)));
            },
            queryParams
        )
        // remember for later
        .then((unsub) => (unsubRealtime = unsub));
    });

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
    };
}

export async function watch<
    C extends Collections | string,
    Expand extends string = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<CollectionResponses[C], Expand> : RecordModel
>(
    collectionName: C,
    queryParams = {} as RecordListOptions & { expand?: Expand },
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
        console.log(client.realtime.isConnected);
        if(realtime) collection.subscribe<T>(
            "*",
            ({ action, record }) => {
                console.log(action);
                (async function (action) {
                    // see https://github.com/pocketbase/pocketbase/discussions/505
                    switch(action) {
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