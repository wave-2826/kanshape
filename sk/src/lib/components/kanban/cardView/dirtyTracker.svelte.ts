import { deepEqual } from "$lib/util";
import { untrack } from "svelte";

export enum DirtyTrackerState {
    Clean, // No local edits, external updates can be merged in directly
    Dirty, // Local edits have been made, external updates should be merged in but not overwrite local edits
    NeedsFull, // Local edits have been made and external updates have been received that would overwrite local edits, so a full version needs to be fetched before further local edits can be made
}

export type DirtyTrackerConfig<TInternal, TExternal> = {
    transformExternal?: (external: TExternal) => TInternal;
    fetchFull?: (id: string, partial: TInternal) => Promise<TInternal>;
};

/**
 * Sometimes, on view panels, we want to simultaneously allow local edits and update from external edits.  
 * This dirty tracker allows reasonable merging of these two sources of updates by tracking which fields
 * have been edited locally and which haven't.  
 * 
 * Furthermore, because in some cases we want the external updates to be of a different shape than the
 * local type and fetch a full version for local edits, this class also allows transforming the external
 * updates before merging them in and fetching a full version of the type before local edits can be made.  
 * 
 * This is such a hacky mess, but it works I guess.
 */
export class DirtyTracker<
    TInternal extends { id?: string } & Record<string, any>,
    TExternal extends { id?: string } & Record<string, any> = TInternal
> {
    private dirtyFields = new Set<keyof TInternal>();
    private internal: TInternal;
    private external: TExternal | null = $state(null);
    private transformExternal: (external: TExternal) => TInternal;
    private fetchFull?: (id: string, partial: TInternal) => Promise<TInternal>;
    private state = $state(DirtyTrackerState.Clean);
    private _loadingFull = $state(false);

    private prevExternalValues = new Map<keyof TInternal, unknown>();
    private prevInternalValues = new Map<keyof TInternal, unknown>();
    private suppressDirty = 0;

    private cleanup: () => void;

    constructor(
        initialExternal: TExternal,
        config?: DirtyTrackerConfig<TInternal, TExternal>
    ) {
        this.transformExternal = config?.transformExternal ?? ((ext: any) => ext as TInternal);
        this.internal = $state(this.transformExternal(initialExternal));
        this.fetchFull = config?.fetchFull;

        this.reset(initialExternal);

        this.snapshotValues();

        this.cleanup = $effect.root(() => {
            $effect(() => {
                // Tracking internal values deeply
                JSON.stringify(this.internal);

                if(this.suppressDirty > 0) {
                    this.snapshotValues();
                    return;
                }

                let anyChanged = false;
                untrack(() => {
                    for(const key of Object.keys(this.internal) as (keyof TInternal)[]) {
                        const next = this.internal[key];
                        const prev = this.prevInternalValues.get(key);
                        if(!deepEqual(prev, next)) {
                            this.prevInternalValues.set(key, $state.snapshot(next));
                            this.dirtyFields.add(key);
                            anyChanged = true;
                        }
                    }
                    if(anyChanged && this.state === DirtyTrackerState.Clean) {
                        this.state = DirtyTrackerState.Dirty;
                    }
                });
            });
        });
    }

    private snapshotValues() {
        this.prevInternalValues.clear();
        for(const key of Object.keys(this.internal) as (keyof TInternal)[]) {
            this.prevInternalValues.set(key, $state.snapshot(this.internal[key]));
        }
    }

    public get current(): TInternal {
        return this.internal;
    }

    public get currentState(): DirtyTrackerState {
        return this.state;
    }

    public get isDirty(): boolean {
        return this.dirtyFields.size > 0;
    }

    public get shouldSave(): boolean {
        return this.state !== DirtyTrackerState.Clean && this.suppressDirty === 0;
    }

    public get currentExternal(): TExternal | null {
        return this.external;
    }

    public get loadingFull(): boolean {
        return this._loadingFull;
    }

    public clearDirty() {
        this.dirtyFields.clear();
        this.state = DirtyTrackerState.Clean;
        this.snapshotValues();
    }

    public reset(newExternal: TExternal) {
        this.suppressDirty++;
        try {
            const transformed = this.transformExternal(newExternal);

            for(const key of Object.keys(transformed) as (keyof TInternal)[]) {
                this.prevExternalValues.set(key, $state.snapshot(transformed[key]));
            }

            for(const key of Object.keys(transformed) as (keyof TInternal)[]) {
                this.internal[key] = transformed[key];
            }
            this.dirtyFields.clear();
            this.state = DirtyTrackerState.Clean;
            this.external = null;
            this.snapshotValues();

            // Trigger fetching full representation automatically if configured
            if(this.fetchFull && newExternal.id) {
                this.performFetchFull(newExternal.id, this.internal);
            }
        } catch (error) {
            console.error("Error resetting dirty tracker:", error);
        } finally {
            this.suppressDirty--;
        }
    }

    public async updateExternal(external: TExternal) {
        untrack(async () => {
            const isNew = this.internal.id !== external.id;
            this.external = external;
            const transformed = this.transformExternal(external);
            
            this.suppressDirty++;
            try {
                if(isNew) {
                    this.reset(external);
                } else { 
                    for(const key of Object.keys(transformed) as (keyof TInternal)[]) {
                        const extVal = transformed[key];
                        const changed = !deepEqual(this.prevExternalValues.get(key), extVal);
                        this.prevExternalValues.set(key, $state.snapshot(extVal));
                        if(!this.dirtyFields.has(key) && changed) {
                            this.internal[key] = extVal;
                        }
                    }
                }
                this.snapshotValues();
            } finally {
                setTimeout(() => this.suppressDirty--, 0);
            }
        });
    }

    private async performFetchFull(id: string, partial: TInternal) {
        if(!this.fetchFull) return;
        
        this._loadingFull = true;
        try {
            const full = await this.fetchFull(id, partial);
            console.log("Fetched full data for dirty tracker:", full);
            
            this.suppressDirty++;
            try {
                // Check that the external record hasn't changed out from under us
                if(this.internal.id === id) {
                    for(const key of Object.keys(full) as (keyof TInternal)[]) {
                        if(!this.dirtyFields.has(key)) {
                            this.internal[key] = full[key];
                        }
                    }
                    this.snapshotValues();
                    
                    // After resolving, downgrade NeedsFull into Dirty (or Clean) because we
                    // now have an accurate full representation merged with local edits
                    if(this.state === DirtyTrackerState.NeedsFull) {
                        this.state = this.dirtyFields.size > 0 ? DirtyTrackerState.Dirty : DirtyTrackerState.Clean;
                    }
                }
            } finally {
                this.suppressDirty--;
            }
        } finally {
            // Only toggle loading off if another fetch hasn't been started for a newer id
            if(this.internal.id === id) this._loadingFull = false;
        }
    }

    public destroy() {
        this.cleanup();
    }
}