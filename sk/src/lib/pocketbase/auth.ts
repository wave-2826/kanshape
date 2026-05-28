import { readable, readonly } from "svelte/store";
import { client, save } from ".";
import type { AuthProviderInfo, RecordService } from "pocketbase";
import { goto, invalidateAll } from "$app/navigation";
import { page } from "$app/state";
import type { UsersResponse } from "./generated-types";

export const authWritable = readable<UsersResponse | null>(
    client.authStore.record as UsersResponse | null,
    (set, update) => {
        client.authStore.onChange((token, record) => {
            update((oldval) => {
                if((oldval === null) !== (record === null)) {
                    // if we went from logged out to logged in, or vice versa, invalidate all data
                    invalidateAll();
                }
                return record as UsersResponse | null;
            });
        }, true);
    }
);
export const authModel = readonly(authWritable);

export async function login(
    email: string,
    password: string,
    register = false,
    rest: { [key: string]: any; } = {}
) {
    if(register) {
        const user = { ...rest, email, password, confirmPassword: password };
        await client.collection("users").create({ ...user, metadata: {} });
    }
    await client.collection("users").authWithPassword(email, password);
}

export async function logout() {
    client.authStore.clear();
    // This will run anyway but we await it here
    await invalidateAll();
}

export async function providerLogin(
    provider: AuthProviderInfo | { name: string },
    authCollection: RecordService
) {
    const authResponse = await authCollection.authWithOAuth2({
        provider: provider.name,
        scopes: ["openid", "email", "profile", "groups"],
        createData: {
            emailVisibility: false
        },
    });

    // update user "record" if "meta" has info it doesn't have
    const { meta, record } = authResponse;
    let changes = {} as { [key: string]: any };
    if(!record.name && meta?.name) {
        changes.name = meta.name;
    }
    
    if(!record.avatar && meta?.avatarUrl) {
        const response = await fetch(meta.avatarUrl);
        if(response.ok) {
            const type = response.headers.get("content-type") ?? "image/jpeg";
            changes.avatar = new File([await response.blob()], "avatar", { type });
        }
    }

    if(Object.keys(changes).length) {
        authResponse.record = await save(authCollection.collectionIdOrName, {
            ...record,
            ...changes,
        });
    }

    const followPath = page.url.searchParams.get("r") || "/";
    goto(decodeURIComponent(followPath));

    return authResponse;
}
