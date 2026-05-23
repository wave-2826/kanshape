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
import { Collections, type CollectionRecords, type CollectionResponses, type IsoAutoDateString, type TypedPocketBase } from "./generated-types";

export const client = new PocketBase(
    browser ? window.location.origin + base : undefined
) as TypedPocketBase;

/**
 * Add a comma-separated expand list like `foo,bar` to the expand result of a returned query
 */
export type ExpandResponse<T extends {
	id: string,
	collectionId: string,
	collectionName: Collections
}, Expand extends ExpandString> = T & { expand: GetExpand<Expand> };

export type ExpandedRecord<K extends keyof CollectionRecords> = undefined | CollectionRecords[K] | CollectionRecords[K][];

// we can't properly (to my knowledge) represent this type, so we just do the first layer.
type ExpandString = "" | `${string}:${keyof CollectionRecords}` | `${string}:${keyof CollectionRecords},${string}`;
type GetExpand<Expand extends ExpandString> = Expand extends `${infer Key}:${infer Collection},${infer Rest}`
    ? Collection extends keyof CollectionRecords
        ? { [K in Key]: ExpandedRecord<Collection> } & GetExpand<Rest extends ExpandString ? Rest : never>
        : {} & GetExpand<Rest extends ExpandString ? Rest : never>
    : Expand extends `${infer Key}:${infer Collection}`
        ? Collection extends keyof CollectionRecords
            ? { [K in Key]: ExpandedRecord<Collection> }
            : {}
        : {};

/**
 * The Pocketbase typegen doesn't store the record associations for expanded fields anywhere,
 * so we add `:collection` suffixes to the expand keys and parse them here to get the correct
 * types for expanded fields. For example, what in normal pocketbase would be `expand: "user_ids,group_ids"`
 * becomes `expand: "user_ids:users,group_ids:groups"` (assuming `users` and `groups` are the
 * correct collection names for those fields). This function simply removes the `:collection`
 * suffixes so Pocketbase can interpret expand like normal.
 */
function stripExpandTypes<T extends RecordListOptions & { expand?: ExpandString }>(options: T): Omit<T, "expand"> & { expand?: string } {
    if(!options.expand) return options;
    const expand = options.expand.split(",").map((part) => part.split(":")[0]).join(",");
    return { ...options, expand };
}

/**
 * The PocketBase SDK returns expanded records as either undefined, T, or T[], depending on the relation type and
 * whether there are any assigned. This function normalizes the result to always be an array of T.
 */
export function canonicalizeExpand<K extends keyof CollectionRecords>(expand: ExpandedRecord<K>): CollectionRecords[K][] {
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

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/** Make all properties K in T optional */
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/** Make all fields of the given types K optional in T */
type PartialByTypes<T, K> = Omit<T, {
    [P in keyof T]: T[P] extends K ? P : never
}[keyof T]> & Partial<Pick<T, {
    [P in keyof T]: T[P] extends K ? P : never
}[keyof T]>>;

export type CreateRecord<T extends { id: string }> = PartialByTypes<PartialBy<T, "id">, IsoAutoDateString>;

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
    Response extends C extends Collections ? CollectionResponses[C] : RecordModel,
    Create extends boolean = false
>(
    collectionName: C,
    record: Create extends true ?
        // Make ID and auto dates optional when creating records, since they're not in the generated schema for some reason
        (C extends Collections ? CreateRecord<CollectionRecords[C]> : RecordModel) :
        // Make all fields optional when updating records. If id isn't included, a new record is created anyway.
        (Partial<C extends Collections ? CollectionRecords[C] : RecordModel>),
    options?: {
        create?: Create,
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

export type PageItemType<T> = T extends Readable<ListResult<infer U>> ? U : never;
export interface PageStore<T = any> extends Readable<ListResult<T>> {
    setPage(newpage: number): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
}

/**
 * Watch a single record.  
 * 
 * Note that `expand` in query params does NOT match the normal pocketbase expand.  
 * It includes, for sole purposes of typing, the collection name. For example,
 * instead of `expand: "user_ids"`, you would do `expand: "user_ids:users"`
 * (assuming the collection name is `users`). This allows the return type to include
 * the expanded fields with the correct types.
 */
export async function watchOne<
    C extends Collections | string,
    Expand extends ExpandString = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<CollectionResponses[C], Expand> : RecordModel
>(
    collectionName: C,
    recordId: string,
    _queryParams = {} as RecordListOptions & { expand?: Expand },
    realtime = browser
): Promise<Readable<T>> {
    const queryParams = stripExpandTypes(_queryParams);

    const collection = client.collection(collectionName);
    let result = await collection.getOne<T>(recordId, queryParams);

    let unsubRealtime: UnsubscribeFunc | undefined;
    
    const store = readable<T>(result, (set) => {
        // watch for changes (only if in the browser)
        if(realtime) collection.subscribe<T>(
            recordId,
            ({ action, record }) => {
                switch(action) {
                    case "update":
                        set((result = record));
                        break;
                    case "delete":
                        set((result = undefined as any));
                        break;
                }
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

/**
 * Watch a list of records with pagination.
 * Returns a store with the list of records and pagination info, as well
 * as helper methods for changing pages.  
 * 
 * Note that `expand` in query params does NOT match the normal pocketbase expand.  
 * It includes, for sole purposes of typing, the collection name. For example,
 * instead of `expand: "user_ids"`, you would do `expand: "user_ids:users"`
 * (assuming the collection name is `users`). This allows the return type to include
 * the expanded fields with the correct types.
 */
export async function watch<
    C extends Collections | string,
    Expand extends ExpandString = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<CollectionResponses[C], Expand> : RecordModel
>(
    collectionName: C,
    _queryParams = {} as RecordListOptions & { expand?: Expand },
    page = 1,
    perPage = 20,
    {
        realtime = browser,
        /** Workaround for pocketbase weirdness; TODO: try to make this work without this hack */
        waitForConnection = false
    } = {}
): Promise<PageStore<T>> {
    const queryParams = stripExpandTypes(_queryParams);
    
    const collection = client.collection(collectionName);
    let result = await collection.getList<T>(page, perPage, queryParams);

    let set: Subscriber<ListResult<T>>;
    let unsubRealtime: UnsubscribeFunc | undefined;

    // Wait for client.realtime.isConnected to be true. I don't really understand why this needs to happen, and it's
    // not documented, but watching _some_ collections before isConnected becomes true (which only happens once subscribing
    // in the first place) will cause the subscription to never fire. This is a workaround for that.
    if(realtime && waitForConnection) {
        while(!client.realtime.isConnected) {
            console.log("Waiting for PocketBase realtime connection...");
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    // fetch first page
    const store = readable<ListResult<T>>(result, (_set) => {
        set = _set;

        console.log(client.realtime.isConnected);
        console.log("Subscribing realtime to collection", collectionName, "with params", queryParams);

        // watch for changes (only if in the browser)
        if(realtime) collection.subscribe<T>(
            "*",
            ({ action, record }) => {
                // console.log("Realtime event:", action, record);

                let items = result.items;

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
                            items = result.items;
                        } else {
                            items = [...result.items, record];
                        }
                        break;
                    case "delete":
                        items = result.items.filter((item) => item.id !== record.id);
                        break;
                }

                set((result = { ...result, items }));
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

/**
 * Query a list of records without subscribing to realtime updates.
 * Returns a plain array of records instead of a store.  
 * 
 * Note that `expand` in query params does NOT match the normal pocketbase expand.  
 * It includes, for sole purposes of typing, the collection name. For example,
 * instead of `expand: "user_ids"`, you would do `expand: "user_ids:users"`
 * (assuming the collection name is `users`). This allows the return type to include
 * the expanded fields with the correct types.
 */
export async function query<
    C extends Collections | string,
    Expand extends ExpandString = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<CollectionResponses[C], Expand> : RecordModel
>(
    collectionName: C,
    _queryParams = {} as RecordFullListOptions & { expand?: Expand }
): Promise<T[]> {
    const queryParams = stripExpandTypes(_queryParams);
    const collection = client.collection(collectionName);
    return await collection.getFullList(queryParams);
}

/**
 * Query a single record without subscribing to realtime updates.  
 * 
 * Note that `expand` in query params does NOT match the normal pocketbase expand.  
 * It includes, for sole purposes of typing, the collection name. For example,
 * instead of `expand: "user_ids"`, you would do `expand: "user_ids:users"`
 * (assuming the collection name is `users`). This allows the return type to include
 * the expanded fields with the correct types.
 */
export async function queryOne<
    C extends Collections | string,
    Expand extends ExpandString = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<CollectionResponses[C], Expand> : RecordModel
>(
    collectionName: C,
    recordId: string,
    _queryParams = {} as RecordListOptions & { expand?: Expand }
): Promise<T> {
    const queryParams = stripExpandTypes(_queryParams);
    const collection = client.collection(collectionName);
    return await collection.getOne(recordId, queryParams);
}

export async function deleteRecord<C extends Collections | string>(
    collectionName: C,
    recordId: string,
    options?: {
        fetch?: typeof window.fetch
    }
): Promise<void> {
    const collection = client.collection(collectionName);
    await collection.delete(recordId, { fetch: options?.fetch });
}