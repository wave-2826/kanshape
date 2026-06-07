import { loadConfig, type AppConfig } from "$lib/config";
import createClient from "openapi-fetch";

// Schema generated with "npx openapi-typescript https://api.onshape.com/api/v16/openapi -o ./schema.d.ts"
import type { paths } from "./schema.d.ts";
import { dev } from "$app/environment";
import { client } from "$lib/pocketbase/index.js";

let kanshapeExtensionDetected: boolean | null = null;

// Caching
const requestCache = new Map<string, { status: number; headers: Record<string, string>; body: any; timestamp: number }>();
const CACHE_EXPIRATION_TIME = 20 * 60 * 1000; // 20 minutes
const CACHE_SIZE_LIMIT = 100;

// Rate limiting
// shouldn't really be hit, but the onshape docs are pretty explicit about limiting,
// so we implement simple global backoff to avoid an accident
let rateLimitBackoffUntil = 0;
let rateLimitBackoffDuration = 2000; // 2 second initial backoff
const MAX_BACKOFF_MS = 10 * 60 * 1000; // 10 minutes max
const BACKOFF_MULTIPLIER = 2;

async function hash(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function detectBridgeExtension(timeout = 100) {
    if(kanshapeExtensionDetected !== null) return kanshapeExtensionDetected;

    return new Promise((resolve) => {
        const id = crypto.randomUUID();

        const listener = (event: MessageEvent) => {
            if(event.data?.type !== "kanshapePong") return;
            if(event.data?.id !== id) return;

            event.stopImmediatePropagation();
            window.removeEventListener("message", listener);
            kanshapeExtensionDetected = true;
            resolve(true);
        };

        window.addEventListener("message", listener);

        window.parent.postMessage({
            type: "kanshapePing",
            id,
        }, "*");

        setTimeout(() => {
            window.removeEventListener("message", listener);
            // kanshapeExtensionDetected = false;
            resolve(false);
        }, timeout);
    });
}

function canonicalizeHeaders(headers: HeadersInit): Record<string, string> {
    const result: Record<string, string> = {};
    if(headers instanceof Headers) {
        headers.forEach((value, key) => {
            result[key.toLowerCase()] = value;
        });
    } else if(Array.isArray(headers)) {
        headers.forEach(([key, value]) => {
            result[key.toLowerCase()] = value;
        });
    } else {
        for(const key in headers) {
            result[key.toLowerCase()] = headers[key];
        }
    }
    return result;
}

export async function onshapeApiRequest<T>(
    config: AppConfig,
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>,
    customCacheKey?: string
): Promise<{
    status: number;
    headers: Record<string, string>;
    body: T;
    cached: boolean;
}> {
    // First, try to detect if the companion extension is installed, and if so, route reqests through it.
    // This allows locally making API calls without needing to use API quota. It's really sketchy but not
    // against TOS from what I can tell.

    // Check if the extension is installed
    if(await detectBridgeExtension()) {
        // Check if still in rate limit backoff - fail fast
        if(Date.now() < rateLimitBackoffUntil) {
            const waitTime = rateLimitBackoffUntil - Date.now();
            return Promise.reject(new Error(`Rate limited. Backoff period active for ${waitTime}ms`));
        }
        
        // Create cache key from request parameters
        const cacheKey = await hash(`${method}:${config.onshape.baseDomain}${path}:${JSON.stringify(body || "")}`);
        
        // Check if response is cached and not expired
        if(requestCache.has(cacheKey)) {
            const cached = requestCache.get(cacheKey)!;
            if(Date.now() - cached.timestamp < CACHE_EXPIRATION_TIME) {
                console.log("Returning cached response for:", path);
                return { ...cached, cached: true }
            }
        }
        
        // If the extension is installed, send a message to it and wait for a response.
        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID();

            const listener = (event: MessageEvent) => {
                if(event.data?.type !== "kanshapeProxyFetchResponse") return;
                if(event.data?.id !== id) return;

                event.stopImmediatePropagation();
                window.removeEventListener("message", listener);

                if(event.data?.error) {
                    reject(new Error(event.data.error));
                } else {
                    const result = event.data.response;
                    
                    // Handle rate limiting
                    if(
                        result.status === 429 ||
                        parseInt(result.headers['x-rate-limit-remaining'] || '1', 10) === 0
                    ) {
                        // Increase backoff exponentially
                        rateLimitBackoffDuration = Math.min(rateLimitBackoffDuration * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
                        rateLimitBackoffUntil = Date.now() + rateLimitBackoffDuration;
                        if(result.status === 429) {
                            reject(new Error(`Rate limited (${result.status}). Backoff ${rateLimitBackoffDuration}ms`));
                            return;
                        }
                    }
                    // reset backoff
                    if(result.status < 400) {
                        rateLimitBackoffDuration = 1000;
                        rateLimitBackoffUntil = 0;
                    }
                    
                    // Cache the response
                    requestCache.set(cacheKey, { ...result, timestamp: Date.now() });
                    
                    // Clean up expired entries
                    for(const [key, value] of requestCache) {
                        if(Date.now() - value.timestamp > CACHE_EXPIRATION_TIME) requestCache.delete(key);
                    }
                    if(requestCache.size > CACHE_SIZE_LIMIT) {
                        const sortedEntries = Array.from(requestCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
                        const entriesToDelete = sortedEntries.slice(0, requestCache.size - CACHE_SIZE_LIMIT);
                        for(const [key] of entriesToDelete) requestCache.delete(key);
                    }
                    
                    resolve(result);
                }
            };

            window.addEventListener("message", listener, {
                capture: true
            });

            window.parent.postMessage({
                type: "kanshapeProxyFetch",
                id,
                payload: {
                    method,
                    url: `${config.onshape.baseDomain}${path}`,
                    body,
                    headers,
                    cacheKey: customCacheKey
                }
            }, "*");
        });
    } else {
        if(dev) console.warn("Kanshape extension not detected. Onshape API requests will be made directly");

        // TODO: Extend caching to here

        if(path.startsWith("/api/")) {
            path = path.slice(4); // remove /api prefix if present, since the backend assumes it
        }

        if(!client.authStore.token) {
            console.error("Can't make unauthenticated Onshape API call");
            return Promise.reject(new Error("Not authenticated with Onshape API"));
        }

        return fetch(`/api/onshape/${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
                "Authorization": client.authStore.token
            },
            body: JSON.stringify({
                content: typeof body === "string" ? body : JSON.stringify(body || {})
            })
        })
            .then(async response => {
                const responseBody = await response.json();
                if(!response.ok) {
                    throw new Error(`Onshape API error: ${response.status} ${response.statusText} - ${JSON.stringify(responseBody)}`);
                }
                return {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: responseBody,
                    cached: false
                };
            });
    }
}

let customBody = Symbol("customBody");
let onshapeApiFetch: typeof fetch = async (input: URL | string | Request, init?: RequestInit): Promise<Response> => {
    // Fetch wrapper that uses our custom request logic
    const url = input instanceof URL ? input.toString() : (typeof input === "string" ? input : input.url);
    let method = init?.method ?? "GET";
    let body = init?.body;
    let headers = init?.headers ?? {};
    if(input instanceof Request) {
        method = input.method ?? method;
        body = (input as any)[customBody] as string ?? body;
        headers = input.headers ?? headers;
    }
    
    // Only intercept requests to the Onshape API
    if(url.includes("onshape.com/api/")) {
        const path = new URL(url).pathname + new URL(url).search;
        return await onshapeApiRequest(
            await loadConfig(),
            method,
            path,
            body,
            canonicalizeHeaders(headers)
        )
            .then(result => new Response(JSON.stringify(result.body), {
                status: result.status,
                headers: {
                    ...result.headers,
                    "X-From-Cache": result.cached ? "true" : "false"
                }
            }));
    }

    console.warn("Attempted to fetch non-Onshape URL through onshapeApiFetch:", input);
    return fetch(input, init);
};

export let onshapeClient = createClient<paths>({
    baseUrl: await loadConfig().then(config => config.onshape.baseDomain + "/api/v16"),
    fetch: onshapeApiFetch,
    // omg why do i need to mess with my fetch library i'm crashing out 😔
    Request: class extends Request {
        constructor(input: URL | string | Request, init?: RequestInit) {
            super(input, init);
            (this as any)[customBody] = init?.body ?? null;
        }
    }
});