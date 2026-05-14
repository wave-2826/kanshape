import { readable } from "svelte/store";
import { client, save } from ".";
import type { AuthModel, AuthProviderInfo, RecordService } from "pocketbase";
import { goto, invalidateAll } from "$app/navigation";

export const authModel = readable<AuthModel | null>(
    null,
    function (set, update) {
        client.authStore.onChange((token, model) => {
            update((oldval) => {
                if(
                    (oldval?.isValid && !model?.isValid) ||
                    (!oldval?.isValid && model?.isValid)
                ) {
                    // if the auth changed, invalidate all page load data
                    invalidateAll();
                }
                return model;
            });
        }, true);
    }
);

export async function login(
    email: string,
    password: string,
    register = false,
    rest: { [key: string]: any; } = {}
) {
    if (register) {
        const user = { ...rest, email, password, confirmPassword: password };
        await client.collection("users").create({ ...user, metadata: {} });
    }
    await client.collection("users").authWithPassword(email, password);
}

export function logout() {
    client.authStore.clear();
}

export async function providerLogin(
    provider: AuthProviderInfo,
    authCollection: RecordService
) {
    const authResponse = await authCollection.authWithOAuth2({
        provider: provider.name,
        createData: {
            // emailVisibility: true,
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

    goto("/");

    return authResponse;
}
