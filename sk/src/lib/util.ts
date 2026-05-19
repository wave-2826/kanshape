export function deepEqual(a: any, b: any): boolean {
    if(a === b) return true;

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