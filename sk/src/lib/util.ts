import { get, type Readable } from "svelte/store";

export function deepEqual(a: any, b: any): boolean {
    if(a === b) return true;
    if(typeof a !== typeof b) return false;

    if(a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }

    if(typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if(aKeys.length !== bKeys.length) {
        return false;
    }

    for(const key of aKeys) {
        if(!b.hasOwnProperty(key) || !deepEqual(a[key], b[key])) {
            return false;
        }
    }

    return true;
}

export function debounce(func: Function, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function(this: any, ...args: any[]) {
        if(timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}

/**
 * Converts a Promise<Readable<T>> into a Readable<T | null> that starts with null and updates to the store's
 * value once the promise resolves. If the promise rejects, the store will remain null and the error will be
 * thrown on subscription.  
 * This is particularly useful for watched record that return a Promise<Readable<T>> because Svelte doesn't allow
 * destructuring(?) readables not defined at the top-level, like inside {#await} blocks.
 */
export function deasyncify<T>(asyncReadable: Promise<Readable<T>>): Readable<T | null> {
    let store: Readable<T> | null = null;
    let error: any = null;
    let subscribers: Array<(value: T | null) => void> = [];

    const subscribe = (run: (value: T | null) => void) => {
        if(store) {
            return store.subscribe(run);
        } else if(error) {
            throw error;
        } else {
            subscribers.push(run);
            run(null);
            return () => {
                subscribers = subscribers.filter(s => s !== run);
            };
        }
    }

    asyncReadable.then(s => {
        store = s;
        subscribers.forEach(s => store!.subscribe(s));
        subscribers = [];
    }).catch(e => {
        error = e;
        subscribers = [];
    });

    return { subscribe };
}