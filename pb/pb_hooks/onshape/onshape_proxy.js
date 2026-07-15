// @ts-check

const REQUEST_CACHE_COLLECTION = "onshape_api_cache";
const MAXIMUM_CACHE_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get the cached response for a given request hash, or null if no valid cache entry exists.
 * @param {string} hash 
 * @returns {{ statusCode: number, headers: Record<string, string | string[]>, body: any } | null}
 */
function checkRequestCache(hash) {
    let record;
    try {
        record = $app.findFirstRecordByFilter(REQUEST_CACHE_COLLECTION, `hash={:hash}`, { hash });
        if(!record) return null;
    } catch(err) {
        // probably just not found
        return null;
    }

    const timestamp = record.get("timestamp");
    if(typeof timestamp !== "number" || Date.now() - timestamp > MAXIMUM_CACHE_AGE_MS) {
        // cache entry is too old, delete it and return null
        try {
            $app.delete(record);
        } catch(err) {
            console.warn("Failed to delete expired Onshape API cache record:", err);
        }
        return null;
    }

    const { parseJSON } = /** @type import("../util") */ (require(`${__hooks}/util`));
    const statusCode = record.get("statusCode");
    const headers = parseJSON(record.get("headers") ?? "{}");
    const body = parseJSON(record.get("body") ?? "null");
    return { statusCode, headers, body };
}

/**
 * Save a request to the cache.
 * @param {string} hash 
 * @param {number} statusCode 
 * @param {Record<string, string | string[]>} headers 
 * @param {any} body 
 */
function saveRequestCache(hash, statusCode, headers, body) {
    let record;
    try {
        record = $app.findFirstRecordByFilter(REQUEST_CACHE_COLLECTION, `hash={:hash}`, { hash });
    } catch(err) {
        record = null;
    }

    const timestamp = Date.now();
    if(record) {
        record.set("statusCode", statusCode);
        record.set("headers", JSON.stringify(headers));
        record.set("body", JSON.stringify(body));
        record.set("timestamp", timestamp);
        $app.save(record);
    } else {
        const newRecord = new Record($app.findCollectionByNameOrId(REQUEST_CACHE_COLLECTION), {
            hash,
            statusCode,
            headers: JSON.stringify(headers),
            body: JSON.stringify(body),
            timestamp
        });
        $app.save(newRecord);
    }
}

/**
 * Make a request to the Onshape API on behalf of a user.
 * @param {core.Record} authRecord - The authenticated user record
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API path (e.g. "v16/parts/d/123/w/456/e/789"). Should be everything AFTER "/api/".
 * @param {Record<string, string>} [extraHeaders] - Additional headers to forward
 * @param {any} [body] - Request body
 * @returns {{ statusCode: number, headers: Record<string, string | string[]>, body: any }}
 */
function onshapeRequest(authRecord, method, path, extraHeaders, body) {
    /** @type import("../config") */
    const { getConfigOption } = require(`${__hooks}/config`);
    /** @type import("./onshape_auth") */
    const { getValidOnshapeToken } = require(`${__hooks}/onshape/onshape_auth`);

    const metadata = getValidOnshapeToken(authRecord);
    if(!metadata) throw new BadRequestError("User is missing Onshape OAuth metadata");

    const baseOnshapeUrl = getConfigOption("onshape/baseDomain", "https://cad.onshape.com").replace(/\/+$/, "");

    const res = $http.send({
        url: `${baseOnshapeUrl}/api/${path}`,
        method,
        headers: {
            "Authorization": `Bearer ${metadata.access_token}`,
            "Content-Type": extraHeaders?.["Content-Type"] ?? "application/json",
            "X-XSRF-TOKEN": extraHeaders?.["X-XSRF-TOKEN"] ?? "",
            "Accept": extraHeaders?.["Accept"] ?? "application/json;charset=UTF-8; qs=0.09"
        },
        body,
        timeout: 10,
    });

    if(!res) throw new InternalServerError("No response from Onshape");

    return { statusCode: res.statusCode, headers: res.headers, body: res.json };
}

/**
 * Handle an Onshape API proxy request.
 * @param {core.RequestEvent} e 
 * @returns 
 */
function handleProxyRequest(e) {
    if(!e.request?.url?.path.startsWith("/api/onshape/proxy/")) return e.next();
    
    const authRecord = /** @type core.Record */ (e.requestInfo().auth);
    if(!authRecord) throw new BadRequestError("Authentication required to access Onshape API");

    let body = /** @type any */ (e.requestInfo().body);
    if(body && typeof body !== "string") {
        body = JSON.stringify(body);
    }

    // Check if there's a cache entry if the user provided a hash
    const cacheHash = e.request.header.get("X-Kanshape-Cache-Key");
    if(cacheHash) {
        const cachedResponse = checkRequestCache(cacheHash);
        if(cachedResponse) {
            // return cached response
            for(const [key, value] of Object.entries(cachedResponse.headers)) {
                for(const v of Array.isArray(value) ? value : [value]) {
                    e.response.header().add(key, v);
                }
            }
            e.response.header().add("X-Kanshape-Cached", "true");
            return e.json(cachedResponse.statusCode, cachedResponse.body);
        }
    }

    const path = e.request.url.path.replace("/api/onshape/proxy/", "") + "?" + (e.request.url.rawQuery ?? ""); // preserve query parameters

    const extraHeaders = {
        "Content-Type": e.request.header.get("Content-Type") ?? "application/json",
        "X-XSRF-TOKEN": e.request.header.get("X-XSRF-TOKEN") ?? "",
        "Accept": e.request.header.get("Accept") ?? "application/json;charset=UTF-8; qs=0.09"
    };

    const res = onshapeRequest(authRecord, e.request.method, path, extraHeaders, body);

    // Save response to cache if hash was provided
    if(cacheHash) {
        saveRequestCache(cacheHash, res.statusCode, res.headers, res.body);
    }
    
    // Copy headers to response
    for(const [key, value] of Object.entries(res.headers)) {
        for(const v of Array.isArray(value) ? value : [value]) {
            e.response.header().add(key, v);
        }
    }
    e.response.header().add("X-Kanshape-Cached", "false");

    return e.json(res.statusCode, res.body);
}

/**
 * Clean up expired Onshape API request cache entries.
 */
function cleanupRequestCache() {
    const cutoff = Date.now() - MAXIMUM_CACHE_AGE_MS;

    // we love N+1 queries :D

    const records = $app.findAllRecords("onshape_api_cache").filter(record => {
        const timestamp = record?.get("timestamp");
        return typeof timestamp === "number" && timestamp < cutoff;
    });

    for(const record of records) {
        if(!record) continue;
        try {
            $app.delete(record);
        } catch(err) {
            console.warn("Failed to delete expired Onshape API cache record:", err);
        }
    }
}

module.exports = {
    handleProxyRequest: handleProxyRequest,
    cleanupRequestCache: cleanupRequestCache,
    onshapeRequest: onshapeRequest
};