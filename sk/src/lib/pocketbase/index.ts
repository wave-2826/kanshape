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
import { Collections, type CollectionRecords, type CollectionResponses, type RecordIdString, type TypedPocketBase, type Update, type Create as CreateRecord } from "./generated-types";

/**
 * The collections that expand types reference for every collection.
 */
const expandCollections = {
    projects: {
        subprojects: "subprojects",
        boards: "boards"
    },
    cards: {
        created_by: "users",
        subprojects: "subprojects",
        section: "sections"
    },
    boards: {
        sections: "sections"
    },
    leaderboard: {
        user: "users",
        project: "projects"
    },
    onshape_documents: {
        project: "projects",
        subproject: "subprojects"
    },
    users: {
        groups: "groups"
    }
} as const satisfies ExpandConfig;

type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];
type RelationFieldKeys<Collection extends Collections> = KeysOfType<
    CollectionRecords[Collection],
    RecordIdString | RecordIdString[] | undefined
> & string;
type BackRelationKey = `${string}_via_${string}`;
type ExpandDescriptor = Collections | {
    collection: Collections,
    /**
     * Override relation cardinality for the expand result.
     * Defaults to PocketBase behavior:
     * - direct relation fields: inferred from field type
     * - back-relations (`foo_via_bar`): treated as arrays
     * See https://pocketbase.io/docs/working-with-relations/#back-relations
     */
    many?: boolean
};
type ExpandConfig = {
    [Collection in Collections]?: Partial<Record<RelationFieldKeys<Collection> | BackRelationKey, ExpandDescriptor>>
};

type ExpandCollections = typeof expandCollections;
type ExpandMapping<Collection extends Collections, Field extends string> =
    Collection extends keyof ExpandCollections ?
        Field extends keyof ExpandCollections[Collection] ?
            ExpandCollections[Collection][Field]
        : never
    : never;
type ExpandTargetCollection<Mapping extends ExpandDescriptor> =
    Mapping extends Collections ? Mapping :
    Mapping extends { collection: infer Target extends Collections } ? Target :
    never;
type IsExpandMany<
    Collection extends Collections,
    Field extends string,
    Mapping extends ExpandDescriptor
> = Mapping extends { many: infer Many extends boolean } ? Many :
    Field extends keyof CollectionRecords[Collection] ?
        CollectionRecords[Collection][Field] extends RecordIdString[] | undefined ? true :
        CollectionRecords[Collection][Field] extends RecordIdString | undefined ? false :
        true
    :
    // PocketBase defaults back-relation expands to arrays unless UNIQUE.
    true;
type ExpandValue<Collection extends Collections, Field extends string> =
    ExpandMapping<Collection, Field> extends infer Mapping extends ExpandDescriptor ?
        CollectionRecords[ExpandTargetCollection<Mapping>]
    : never;
type ExpandField<Collection extends Collections, Field extends string> =
    ExpandMapping<Collection, Field> extends infer Mapping extends ExpandDescriptor ?
        IsExpandMany<Collection, Field, Mapping> extends true ?
            ExpandValue<Collection, Field>[] | undefined :
            ExpandValue<Collection, Field> | undefined
    :
    never;

type Trim<S extends string> =
    S extends ` ${infer Rest}` ? Trim<Rest> :
    S extends `${infer Rest} ` ? Trim<Rest> :
    S;
type ExpandEntry<Collection extends Collections, Field extends string> =
    ExpandField<Collection, Field> extends never ? {} :
    { [K in Field]: ExpandField<Collection, Field> };

type ExpandResult<Collection extends Collections, Expand extends string> =
    Expand extends `${infer Field},${infer Rest}` ?
        ExpandEntry<Collection, Trim<Field>> & ExpandResult<Collection, Rest> :
    Expand extends `${infer Field}` ?
        ExpandEntry<Collection, Trim<Field>> :
    {};

export const client = new PocketBase(
    browser ? window.location.origin + base : undefined
) as TypedPocketBase;

/**
 * Add a comma-separated expand list like `foo,bar` to the expand result of a returned query
 */
export type ExpandRecord<Collection extends Collections, Expand extends string> = CollectionRecords[Collection] & { expand: ExpandResult<Collection, Expand> };
/**
 * Add a comma-separated expand list like `foo,bar` to the expand result of a returned query,
 * but with the fields of the collection's response type instead of the record type (which is
 * identical for most collections, but not all because of the auth system fields that only appear
 * in the response types).
 */
export type ExpandResponse<Collection extends Collections, Expand extends string> = CollectionResponses[Collection] & { expand: ExpandResult<Collection, Expand> };

export function stripExpand<Record extends { expand?: any }>(record: Record): Omit<Record, "expand"> {
    const { expand, ...rest } = record;
    return rest;
}

export class CancelBatch extends Error {
    constructor(message?: string) {
        super(message);
        this.name = "CancelBatch";
    }
}

export async function batch(run: (batch: BatchService) => Promise<void>): Promise<BatchRequestResult[] | null> {
    const batch = client.createBatch();

    try {
        await run(batch);
    } catch(err) {
        if(err instanceof CancelBatch) {
            console.warn("Batch cancelled:", err.message);
            return null;
        }
    
        throw err;
    }

    return await batch.send();
}

/**
 * For relation and multi-select (string) fields in pocketbase, we can use "+fieldname",
 * "fieldname+", or "fieldname-" to prepend, append, or remove values from the array instead
 * of replacing it. This type adds those variants as optional properties.
 */
type AddTagOperations<T extends { [key: string]: unknown }> = {
    [K in keyof T as (K extends string ?
        T[K] extends (RecordIdString[] | RecordIdString | undefined) ? K | `+${K}` | `${K}+` | `${K}-` : K
    : never)]?: T[K]
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
    Create extends boolean = false,
    Expand extends string = "",
    Batch extends BatchService | undefined = undefined,
    Response = Batch extends BatchService ? null :
        C extends Collections ? ExpandResponse<C, Expand> : RecordModel
>(
    collectionName: C,
    record: Create extends true ?
        (C extends Collections ? CreateRecord<C> : RecordModel) :
        (C extends Collections ? AddTagOperations<Update<C>> : Partial<RecordModel>) & { id: string },
    options?: {
        create?: Create,
        fetch?: typeof window.fetch,
        /** Fields to expand on the response */
        expand?: Expand,
        batch?: Batch
    }
): Promise<Response> {
    // convert obj to FormData in case one of the fields is instanceof FileList
    const data = objectToFormData(record);
    if(options?.batch) {
        if(!options.create && record["id"]) {
            options.batch.collection(collectionName).update(
                record.id, data,
                { fetch: options.fetch, expand: options.expand }
            );
        } else {
            options.batch.collection(collectionName).create(
                data,
                { fetch: options.fetch, expand: options.expand }
            );
        }
        return null as any;
    }

    if(!options?.create && record["id"]) {
        // "create" flag overrides update
        return await client.collection(collectionName).update<Response>(
            record.id, data,
            { fetch: options?.fetch, expand: options?.expand }
        );
    } else {
        return await client.collection(collectionName).create<Response>(
            data,
            { fetch: options?.fetch, expand: options?.expand }
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
 */
export async function watchOne<
    C extends Collections | string,
    Expand extends string = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<C, Expand> : RecordModel
>(
    collectionName: C,
    recordId: string,
    queryParams = {} as RecordListOptions & { expand?: Expand },
    realtime = browser
): Promise<Readable<T>> {
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

    let subscriptions = 0;
    return {
        ...store,
        subscribe(run, invalidate) {
            const unsubStore = store.subscribe(run, invalidate);
            subscriptions++;

            return async () => {
                unsubStore();
                subscriptions--;
                if(subscriptions > 0) return; // don't unsubscribe from realtime if there are still subscribers

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
 */
export async function watch<
    C extends Collections | string,
    Expand extends string = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<C, Expand> : RecordModel
>(
    collectionName: C,
    queryParams: RecordListOptions & { expand?: Expand } = {},
    page = 1,
    perPage = 20,
    {
        realtime = browser,
        /** Workaround for pocketbase weirdness; TODO: try to make this work without this hack */
        waitForConnection = false,
        /**
         * A set of collections to also watch and re-poll the main list on change of. This is an
         * unfortunate workaround for the fact that pocketbase doesn't (and kind of can't) trigger
         * realtime events when a view table changes its results, especially in the case of arbitrary
         * queries that reference other tables.  
         * This has nearly zero overhead if the collection is already subscribed to, but will
         * unnecessarily changed records otherwise.
         */
        pollOnChange = []
    }: {
        realtime?: boolean,
        waitForConnection?: boolean,
        pollOnChange?: Collections[]
    } = {}
): Promise<PageStore<T>> {
    const collection = client.collection(collectionName);
    let result = await collection.getList<T>(page, perPage, queryParams);
    if(result.totalPages === 0) result.totalPages = 1;

    let set: Subscriber<ListResult<T>>;
    let unsubRealtime: UnsubscribeFunc[] = [];

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

        console.info("Subscribing realtime to collection", collectionName, "with params", queryParams);

        // watch for changes (only if in the browser)
        if(realtime) {
            collection.subscribe<T>(
                "*",
                ({ action, record }) => {
                    console.info("Realtime event:", action, record);

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
            ).then((unsub) => unsubRealtime.push(unsub)); // remember for later
            
            for(const coll of pollOnChange) {
                client.collection(coll).subscribe(
                    "*",
                    () => {
                        console.info(`Change detected in collection ${coll} - refreshing list for ${collectionName}`);
                        setPage(result.page);
                    },
                    queryParams
                ).then((unsub) => {
                    // Add to unsubRealtime so that we can unsubscribe from all on cleanup
                    unsubRealtime.push(unsub);
                });
            }
        }
    });

    async function setPage(newpage: number) {
        const { page, totalPages, perPage } = result;
        if(page > 0 && newpage <= totalPages) {
            set((result = await collection.getList(newpage, perPage, queryParams)));
        }
    }

    let subscriptions = 0;
    return {
        ...store,
        subscribe(run, invalidate) {
            const unsubStore = store.subscribe(run, invalidate);
            subscriptions++;
            
            return async () => {
                unsubStore();
                subscriptions--;
                if(subscriptions > 0) return; // don't unsubscribe from realtime if there are still subscribers

                console.info("Unsubscribing realtime from collection", collectionName);
                if(unsubRealtime) {
                    // Technically, we should await here, but that will slow down navigation UX.
                    unsubRealtime.forEach((unsub) => /* await */ unsub());
                }
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
 */
export async function query<
    C extends Collections | string,
    Expand extends string = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<C, Expand> : RecordModel
>(
    collectionName: C,
    queryParams = {} as RecordFullListOptions & { expand?: Expand }
): Promise<T[]> {
    const collection = client.collection(collectionName);
    return await collection.getFullList(queryParams);
}

/**
 * Query a single record without subscribing to realtime updates.
 */
export async function queryOne<
    C extends Collections | string,
    Expand extends string = "",
    T extends { id: string } = C extends Collections ? ExpandResponse<C, Expand> : RecordModel
>(
    collectionName: C,
    recordId: string,
    queryParams = {} as RecordListOptions & { expand?: Expand }
): Promise<T> {
    const collection = client.collection(collectionName);
    return await collection.getOne(recordId, queryParams);
}

export async function deleteRecord<C extends Collections | string>(
    collectionName: C,
    recordId: string,
    options?: {
        fetch?: typeof window.fetch,
        batch?: BatchService
    }
): Promise<void> {
    const collection = options?.batch ? options.batch.collection(collectionName) : client.collection(collectionName);
    await collection.delete(recordId, { fetch: options?.fetch });
}