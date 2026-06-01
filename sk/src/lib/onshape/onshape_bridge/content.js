// @ts-nocheck

const script = document.createElement("script");
script.src = browser.runtime.getURL("content_fetch.js");
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

const _browser = globalThis.browser ?? globalThis.chrome;

const CACHE_KEY = "requestCache";
const CACHE_EXPIRATION_TIME = 20 * 60 * 1000;
const CACHE_SIZE_LIMIT = 100;

const pendingRequests = new Map();

async function hash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

async function getCache() {
    const result = await _browser.storage.local.get(CACHE_KEY);
    return result[CACHE_KEY] || {};
}

async function setCache(cache) {
    await _browser.storage.local.set({
        [CACHE_KEY]: cache
    });
}

async function cleanupCache(cache) {
    const now = Date.now();

    for(const [key, value] of Object.entries(cache)) {
        if(now - value.timestamp > CACHE_EXPIRATION_TIME) {
            delete cache[key];
        }
    }

    const entries = Object.entries(cache);

    if(entries.length > CACHE_SIZE_LIMIT) {
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        const excess = entries.length - CACHE_SIZE_LIMIT;

        for(let i = 0; i < excess; i++) {
            delete cache[entries[i][0]];
        }
    }

    return cache;
}

// responses from page-fetch.js
window.addEventListener("message", (event) => {
    if(event.source !== window) return;
    if(event.data?.type !== "kanshapePageFetchResponse") return;

    const pending = pendingRequests.get(event.data.requestId);

    if(!pending) return;

    pendingRequests.delete(event.data.requestId);

    if(event.data.error) {
        pending.reject(new Error(event.data.error));
    } else {
        pending.resolve(event.data.response);
    }
});

async function pageFetch(payload) {
    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
        pendingRequests.set(requestId, {
            resolve,
            reject,
        });

        window.postMessage({
            type: "kanshapePageFetch",
            requestId,
            payload,
        });
    });
}

window.addEventListener("message", async (event) => {
    const data = event.data;

    if(data?.type === "kanshapePing") {
        event.source.postMessage({
            type: "kanshapePong",
            id: data.id,
        }, event.origin);

        return;
    }

    if(data?.type !== "kanshapeProxyFetch") {
        return;
    }

    try {
        const cacheKey = await hash(
            `${data.payload.method ?? "GET"}:` +
            `${data.payload.url}:` +
            `${JSON.stringify(data.payload.headers ?? {})}:` +
            `${data.payload.body ?? ""}:` +
            `${data.payload.cacheKey ?? ""}`
        );

        let cache = await getCache();

        const cached = cache[cacheKey];

        if(cached && Date.now() - cached.timestamp < CACHE_EXPIRATION_TIME) {
            event.source.postMessage({
                type: "kanshapeProxyFetchResponse",
                id: data.id,
                response: {
                    status: cached.status,
                    headers: cached.headers,
                    body: cached.body,
                    cached: true,
                },
            }, event.origin);

            return;
        }

        const response = await pageFetch(data.payload);

        let body;

        try {
            if(response.status >= 200 && response.status < 300) {
                body = JSON.parse(response.body);
            } else {
                body = response.body;
            }
        } catch(err) {
            throw new Error(
                `Failed to parse JSON: ${err.message}`
            );
        }

        const result = {
            status: response.status,
            headers: response.headers,
            body,
        };

        cache[cacheKey] = {
            ...result,
            timestamp: Date.now(),
        };

        cache = await cleanupCache(cache);
        await setCache(cache);

        event.source.postMessage({
            type: "kanshapeProxyFetchResponse",
            id: data.id,
            response: {
                ...result,
                cached: false,
            },
        }, event.origin);
    } catch(err) {
        event.source.postMessage({
            type: "kanshapeProxyFetchResponse",
            id: data.id,
            error: err.message,
        }, event.origin);
    }
});