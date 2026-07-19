/**
 * Diff creation/applying for merging server changes with local changes.
 */

const DELETED = Symbol('DELETED');
export type Diff<T> = {
    /** New value for primitive/set operations */
    __v?: T;
    /** Mark as deleted */
    __d?: typeof DELETED;
    /** Object property changes */
    __props?: { [key: string]: Diff<any> };
    /** Array item changes (by index) */
    __items?: Diff<any>[];
};

/**
 * Creates a diff between `oldValue` and `newValue`.
 *
 * Handles primitives, objects, arrays, and nullish values.
 */
export function createDiff<T>(oldValue: T, newValue: T): Diff<T> {
    if(oldValue == null && newValue == null) return {};
    
    // Arrays
    if(Array.isArray(oldValue) && Array.isArray(newValue)) {
        return diffArrays(oldValue, newValue);
    }
    
    // Plain objects
    if(isPlainObject(oldValue) && isPlainObject(newValue)) {
        return diffObjects(
            oldValue as Record<string, unknown>,
            newValue as Record<string, unknown>,
        ) as Diff<T>;
    }
    
    // Primitives - compare by reference
    if(oldValue !== newValue) {
        return { __v: structuredClone(newValue) as T };
    }
    
    return {};
}

function diffArrays(oldArr: unknown[], newArr: unknown[]): Diff<any> {
    const items: Diff<any>[] = [];
    const maxLen = Math.max(oldArr.length, newArr.length);
    let hasChanges = false;
    
    for(let i = 0; i < maxLen; i++) {
        if(i >= newArr.length) {
            // Item was removed
            items.push({ __d: DELETED });
            hasChanges = true;
        } else if(i >= oldArr.length) {
            // Item was added
            items.push({ __v: structuredClone(newArr[i]) });
            hasChanges = true;
        } else {
            const itemDiff = createDiff(oldArr[i], newArr[i]);
            items.push(itemDiff);
            if(Object.keys(itemDiff).length > 0) {
                hasChanges = true;
            }
        }
    }
    
    return hasChanges ? { __items: items } : {};
}

function diffObjects(
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>,
): Diff<Record<string, unknown>> {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    const props: Record<string, Diff<any>> = {};
    let hasChanges = false;
    
    for(const key of allKeys) {
        if(!(key in newObj)) {
            // Key was removed
            props[key] = { __d: DELETED };
            hasChanges = true;
        } else if(!(key in oldObj)) {
            // Key was added
            props[key] = { __v: structuredClone(newObj[key]) };
            hasChanges = true;
        } else {
            const propDiff = createDiff(oldObj[key], newObj[key]);
            if(Object.keys(propDiff).length > 0) {
                props[key] = propDiff;
                hasChanges = true;
            }
        }
    }
    
    return hasChanges ? { __props: props } : {};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}

/**
* Applies a diff on top of an optional local value, performing a best-effort
* merge.
* Deleted fields are removed from the result, set** fields are replaced with
* the diff's value, object diffs are recursively merged with preference to the
* diff, and array diffs are applied by index.
* This is best-effort, so it never throws.
*/
export function applyDiff<T>(diff: Diff<T>, localValue?: T): T {
    // Deletion
    if(diff.__d === DELETED) {
        return undefined as unknown as T;
    }
    
    // Explicit value set
    if(diff.__v !== undefined) {
        return structuredClone(diff.__v) as T;
    }
    
    // Array diff
    if(diff.__items !== undefined) {
        const local = Array.isArray(localValue) ? [...localValue] : [];
        const result: unknown[] = [];
        
        for(const itemDiff of diff.__items) {
            if(itemDiff.__d === DELETED) {
                continue; // skip deleted items
            }
            if(itemDiff.__v !== undefined) {
                result.push(structuredClone(itemDiff.__v));
            } else {
                // Merge with the corresponding local item if available
                const localItem = result.length < local.length ? local[result.length] : undefined;
                result.push(applyDiff(itemDiff, localItem));
            }
        }
        
        return result as unknown as T;
    }
    
    // Object diff
    if(diff.__props !== undefined) {
        const local = typeof localValue === 'object' && localValue != null && !Array.isArray(localValue)
            ? { ...(localValue as Record<string, unknown>) }
            : {};
        
        for(const [key, propDiff] of Object.entries(diff.__props)) {
            if(propDiff.__d === DELETED) delete local[key];
            else if(propDiff.__v !== undefined) local[key] = structuredClone(propDiff.__v);
            else local[key] = applyDiff(propDiff, local[key]);
        }
        
        return local as unknown as T;
    }
    
    // for empty diffs, return the local value
    return localValue !== undefined ? (structuredClone(localValue) as T) : (localValue as T);
}