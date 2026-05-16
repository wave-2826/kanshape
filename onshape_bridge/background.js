const requestCache = new Map();
const CACHE_EXPIRATION_TIME = 20 * 60 * 1000; // 20 minutes
const CACHE_SIZE_LIMIT = 100;

browser.runtime.onMessage.addListener(async (msg, _sender) => {
    if(msg.type !== "kanshapeProxyFetch") return;

    try {
        return await handleFetch(msg.payload);
    } catch (err) {
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

const allowedDomains = /^https:\/\/[^/]+\.onshape\.com\/api\//;
async function handleFetch(payload) {
    if(!allowedDomains.test(payload.url)) {
        throw new Error("Domain not allowed");
    }

    const cacheKey = await hash(`${payload.method || "GET"}:${payload.url}:${JSON.stringify(payload.headers || {})}:${payload.body || ""}`);
    if(requestCache.has(cacheKey) && (Date.now() - requestCache.get(cacheKey).timestamp < CACHE_EXPIRATION_TIME)) {
        console.log("Returning cached response for:", payload.url);
        return { ...requestCache.get(cacheKey), cached: true };
    }

    const response = await fetch(payload.url, {
        method: payload.method || "GET",
        headers: payload.headers || {},
        body: payload.body,
        credentials: "include",
    });

    const text = await response.text();

    const result = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: text
    };

    requestCache.set(cacheKey, { ...result, timestamp: Date.now() });
    for(const [key, value] of requestCache) {
        if(Date.now() - value.timestamp > CACHE_EXPIRATION_TIME) requestCache.delete(key);
    }
    if(requestCache.size > CACHE_SIZE_LIMIT) {
        const sortedEntries = Array.from(requestCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
        const entriesToDelete = sortedEntries.slice(0, requestCache.size - CACHE_SIZE_LIMIT);
        for(const [key] of entriesToDelete) requestCache.delete(key);
    }
    
    return { ...result, cached: false };
}