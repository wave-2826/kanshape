import { query } from "./pocketbase";
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
    };
};
const defaultConfig: AppConfig = {
    auth: {
        autoOAuth: null
    },
    site: {
        name: "Kanshape",
        logoUrl: null
    }
};


/** I like TS silliness :) */
type LeafPaths<T> = T extends object ? {
    [K in keyof T]-?:
        K extends string ? (T[K] extends object ? `${K}/${LeafPaths<T[K]>}` : K) : never;
}[keyof T] : never;

/** All paths in the config table. */
type ConfigPaths = LeafPaths<AppConfig>;

/**
 * Loads the application configuration from the PocketBase `config` collection or browser cache.
 * @param fetch Custom fetch function to override the normal config fetch with.
 * @returns The loaded application configuration.
 */
export async function loadConfig(fetch: typeof window.fetch = window.fetch): Promise<AppConfig> {
    // eh no cache for now since this is pretty fast
    const pairs = await query(Collections.Config, {
        fields: "key,value",
        fetch
    });

    let result = defaultConfig;
    for(const { key, value } of pairs) {
        const path = key as ConfigPaths;
        setPath(result, path.split("/"), value);
    }
    return result;
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