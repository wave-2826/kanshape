import { queryOne } from "$lib/pocketbase";
import { Collections } from "$lib/pocketbase/generated-types";

let cache: Record<string, Promise<string> | string> = {};
export async function getUsername(id: string): Promise<string> {
    if(cache[id]) return cache[id];

    cache[id] = new Promise(async (resolve) => {
        console.log("query user");
        const user = await queryOne(Collections.Users, id);
        resolve(user.name);
        cache[id] = user.name;
    });
    return cache[id];
}