import { queryOne } from "$lib/pocketbase";
import { authModel } from "$lib/pocketbase/auth";
import { Collections } from "$lib/pocketbase/generated-types";
import { get } from "svelte/store";

let cache: Record<string, Promise<string> | string> = {};
export async function getUsername(id: string): Promise<string> {
    // we already have it, why not
    const auth = get(authModel);
    if(id === auth?.id) return auth.name;

    if(cache[id]) return cache[id];

    cache[id] = new Promise(async (resolve) => {
        const user = await queryOne(Collections.Users, id);
        resolve(user.name);
        cache[id] = user.name;
    });
    return cache[id];
}

export async function getGroupName(id: string): Promise<string> {
    if(cache[id]) return cache[id];

    cache[id] = new Promise(async (resolve) => {
        const group = await queryOne(Collections.Groups, id);
        resolve(group.name);
        cache[id] = group.name;
    });
    return cache[id];
}