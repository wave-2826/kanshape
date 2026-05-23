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