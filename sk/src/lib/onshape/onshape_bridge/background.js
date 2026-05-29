// @ts-nocheck

const _browser = globalThis.browser ?? globalThis.chrome;

const CACHE_KEY = "requestCache";
const CACHE_EXPIRATION_TIME = 20 * 60 * 1000; // 20 minutes
const CACHE_SIZE_LIMIT = 100;

const allowedDomains = /^https:\/\/[^/]+\.onshape\.com\/api\//;

_browser.runtime.onMessage.addListener(async (msg, _sender) => {
    if(msg.type !== "kanshapeProxyFetch") return;
    
    try {
        return await handleFetch(msg.payload);
    } catch(err) {
        return {
            error: err.message,
        };
    }
});

function hash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return crypto.subtle.digest("SHA-256", data).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    });
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

    // Remove expired
    for(const [key, value] of Object.entries(cache)) {
        if(now - value.timestamp > CACHE_EXPIRATION_TIME) delete cache[key];
    }

    // Enforce size limit
    const entries = Object.entries(cache);

    if(entries.length > CACHE_SIZE_LIMIT) {
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        const removeCount = entries.length - CACHE_SIZE_LIMIT;
        for(let i = 0; i < removeCount; i++) delete cache[entries[i][0]];
    }

    return cache;
}

async function handleFetch(payload) {
    if(!allowedDomains.test(payload.url)) {
        throw new Error("Domain not allowed");
    }

    const cacheKey = await hash(`${payload.method || "GET"}:${payload.url}:${JSON.stringify(payload.headers ?? {})}:${payload.body ?? ""}`);

    let cache = await getCache();
    const cachedEntry = cache[cacheKey];
    if(cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_EXPIRATION_TIME)) {
        console.log("Returning cached response for:", payload.url);
        return {
            status: cachedEntry.status,
            headers: cachedEntry.headers,
            body: cachedEntry.body,
            cached: true,
        };
    }

    const response = await fetch(payload.url, {
        method: payload.method || "GET",
        headers: payload.headers || {},
        body: payload.body,
        credentials: "include"
    });

    const text = await response.text();

    const result = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: text
    };

    cache[cacheKey] = {
        ...result,
        timestamp: Date.now(),
    };

    cache = await cleanupCache(cache);
    await setCache(cache);

    return { ...result, cached: false };
}