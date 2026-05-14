import { query, save } from "./pocketbase";
import { Collections } from "./pocketbase/generated-types";

/**
 * Configuration for the application. This is stored in the `config` table in PocketBase and loaded on app startup,
 * then cached for the future. The table keys slash-separated value pairs
 */
export type AppConfig = {
    auth: {
        /**
         * Either null (disabled) or a string (the name of the Pocketbase OAuth provider to
         * automatically authenticate with when the site loads)
         */
        autoOAuth: string | null;
    };
    site: {
        /**
         * The name displayed for the site.
         */
        name: string;
        /**
         * The URL of the site's logo, shown in the header. Nothing will be shown if null.
         */
        logoUrl: string | null;
        /**
         * The URL of the site's favicon.
         */
        faviconUrl: string;
    };
};
const defaultConfig: AppConfig = {
    auth: {
        autoOAuth: null
    },
    site: {
        name: "Kanshape",
        logoUrl: null,
        faviconUrl: "/favicon.svg"
    }
};
export type ConfigValueType = {
    optional: boolean;
    type: "string" | "number" | "boolean";
    name?: string;
};
export const configTypes: { [K in ConfigPath]: ConfigValueType } = {
    "auth/autoOAuth": { optional: true, type: "string", name: "Automatically authenticate with OAuth provider" },
    "site/name": { optional: false, type: "string", name: "Site Name" },
    "site/logoUrl": { optional: true, type: "string", name: "Site Logo URL" },
    "site/faviconUrl": { optional: false, type: "string", name: "Site Favicon URL" }
} as const;


/** I like TS silliness :) */
type LeafPaths<T> = T extends object ? {
    [K in keyof T]-?:
        K extends string ? (T[K] extends object ? `${K}/${LeafPaths<T[K]>}` : K) : never;
}[keyof T] : never;
type LeafPathType<T, P extends string> = P extends `${infer Key}/${infer Rest}`
    ? Key extends keyof T
        ? (Rest extends LeafPaths<T[Key]> ? LeafPathType<T[Key], Rest> : never)
        : never
    : (P extends keyof T ? T[P] : never);

/** All paths in the config table. */
export type ConfigPath = LeafPaths<AppConfig>;

let configPathIDs: Map<ConfigPath, string> | null = null;

let configCache: AppConfig | null = null;

/**
 * Loads the application configuration from the PocketBase `config` collection or browser cache.
 * @param fetch Custom fetch function to override the normal config fetch with.
 * @returns The loaded application configuration.
 */
export async function loadConfig(fetch: typeof window.fetch = window.fetch): Promise<AppConfig> {
    if(configCache) return configCache;

    // eh no cache for now since this is pretty fast
    const pairs = await query(Collections.Config, {
        fields: "key,value,id",
        fetch
    });

    configPathIDs = new Map();

    let result = defaultConfig;
    for(const { key, value, id } of pairs) {
        const path = key as ConfigPath;
        configPathIDs.set(path, id);
        setPath(result, path.split("/"), value);
    }

    configCache = result;
    return result;
}

export async function updateConfig<K extends ConfigPath>(
    path: K, value: LeafPathType<AppConfig, K>,
    fetch: typeof window.fetch = window.fetch
): Promise<void> {
    if(!configPathIDs) loadConfig(fetch);

    const id = configPathIDs!.get(path);
    await save(Collections.Config, { id, key: path, value }, id === undefined, fetch);
}

/** Helper function to set a value at a specific path in an object. */
function setPath(obj: any, path: string[], value: any) {
    if(path.length === 1) {
        obj[path[0]] = value;
    } else {
        const key = path.shift()!;
        if(!obj[key]) obj[key] = {};
        setPath(obj[key], path, value);
    }
}