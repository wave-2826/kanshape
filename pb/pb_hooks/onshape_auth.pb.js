// @ts-check
/// <reference path="../pb_data/types.d.ts" />

const ONSHAPE_AUTHORIZE_URL = "https://oauth.onshape.com/oauth/authorize";
const ONSHAPE_TOKEN_URL = "https://oauth.onshape.com/oauth/token";
const ONSHAPE_SCOPES = "OAuth2Read OAuth2Write OAuth2ReadPII";

// I'm not 100% certain on this, but Onshape's OAuth endpoints seem to faithfully follow
// RFC 6749 (The OAuth 2.0 Authorization Framework), so I'm making requests according to that.
// Their docs don't cover all API details, but they use passport which implements the normal
// flow. See their docs here: https://onshape-public.github.io/docs/auth/oauth/

const { getConfigOption, getRequiredConfigOption } = require("./config");

// XSRF handling
// Maybe I'm not doing this right, but the point of the OAuth `state` parameter is twofold:
// - Store state necessary once we return from oauth - in our case, where to redirect the user back
// - Protect against XSRF by including an unguessable value and verifying it on return
// To accomplish this, we combine the user ID (which we get in both cases) with the returnTo path
// and encode them into a single string for the state parameter. Then on return, we decode and verify
// the user ID matches so we can trust the request was legitimate.
// See https://developers.google.com/identity/openid-connect/openid-connect?hl=en#createxsrftoken for
// a much better example on what XSRF protection should look like in an OAuth flow (though of course
// we're not using Google OAuth)

/**
 * Encode the user ID and returnTo path into a single string for the OAuth state parameter
 * @param {string} userId The ID of the user initiating the OAuth flow
 * @param {string} returnTo The path to return the user to after OAuth completes
 * @returns {string} An encoded string containing the user ID and returnTo path
 */
function encodeXSRF(userId, returnTo) {
    const data = JSON.stringify({ userId, returnTo });
    return btoa(data);
}
/**
 * Decode the OAuth state parameter into the user ID and returnTo path
 * @param {string} state The encoded state parameter
 * @returns {{
 *     userId: string;
 *     returnTo: string;
 * } | null} An object containing the user ID and returnTo path, or null if decoding fails
 */
function decodeXSRF(state) {
    try {
        const data = atob(state);
        const { userId, returnTo } = JSON.parse(data);
        if(typeof userId === "string" && typeof returnTo === "string") {
            return { userId, returnTo };
        }
    } catch(err) {
        console.warn("Failed to decrypt XSRF state:", err);
    }
    return null;
}

/**
 * Get the user's Onshape OAuth metadata from their record. This is where we store the access token,
 * refresh token, expiration, etc.
 * @param {core.Record} record The user's record to get the metadata from
 * @returns {{
 *     access_token: string;
 *     refresh_token: string;
 *     token_type: string;
 *     expires_in: number;
 *     expires_at: number;
 *     scope: string;
 * } | null} The user's Onshape metadata, or null if not found
 */
function getOnshapeMetadata(record) {
    const metadata = record.get("onshape_oauth");
    return metadata;
}

/**
 * Set the user's Onshape OAuth metadata in their record
 * @param {core.Record} record The user's record to update
 * @param {{
 *     access_token: string;
 *     refresh_token: string;
 *     token_type: string;
 *     expires_in: number;
 *     expires_at: number;
 *     scope: string;
 * }} tokenJson The token information to store. Comes from Onshape directly.
 * @returns {ReturnType<typeof getOnshapeMetadata> | null} The updated Onshape metadata, or null if not found
 */
function setOnshapeMetadata(record, tokenJson) {
    const metadata = record.get("metadata") || {};
    metadata.onshape = {
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token,
        token_type: tokenJson.token_type,
        expires_in: tokenJson.expires_in,
        expires_at: Date.now() + (tokenJson.expires_in ? tokenJson.expires_in * 1000 : 0),
        scope: tokenJson.scope,
    };
    record.set("metadata", metadata);
    $app.save(record);

    return metadata.onshape;
}

/**
 * Build the Onshape OAuth authorization URL with the necessary query parameters
 * @param {string} redirectUri The URI to redirect back to after authorization (must match the one registered in Onshape exactly)
 * @param {string} state The state parameter for XSRF protection and returning to the correct page
 */
function buildAuthorizeUrl(redirectUri, state) {
    const authorizeUrl = new URL(ONSHAPE_AUTHORIZE_URL);
    const param = authorizeUrl.searchParams.set.bind(authorizeUrl.searchParams); // :)
    param("response_type", "code"); // not sure this is required but it works
    param("client_id", getRequiredConfigOption("onshape/clientId"));
    param("redirect_uri", redirectUri);
    param("scope", ONSHAPE_SCOPES);
    param("state", state);
    return authorizeUrl.toString();
}

/**
 * Exchange an authorization code for an access token and refresh token. Onshape's OAuth endpoint requires
 * this two-step process where the initial redirect gives an authorization code and we separately get a token
 * because the server is the one who actually sends the client ID and secret, not the client.
 * @param {string} code 
 * @returns 
 */
function exchangeAuthorizationCode(code) {
    const body = new URLSearchParams({
        client_id: getRequiredConfigOption("onshape/clientId"),
        client_secret: getRequiredConfigOption("onshape/clientSecret"),
        code,
        grant_type: "authorization_code"
    });

    const res = $http.send({
        url: ONSHAPE_TOKEN_URL,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        timeout: 10,
    });

    if(!res || res.statusCode >= 400) {
        throw new InternalServerError(`Onshape authorization exchange failed with status ${res?.statusCode ?? "unknown"}`);
    }

    return res.json();
}

/**
 * Refresh the user's Onshape token from their Onshape metadata. Updates the user's record and returns
 * the new token metadata.
 * @param {core.Record} userRecord The user's record to update with the new token information
 * @param {ReturnType<typeof getOnshapeMetadata>} metadata The user's current Onshape metadata, which should include the refresh token.
 *   Passed in separately from userRecord so we don't make extra database calls.
 * @returns {ReturnType<typeof getOnshapeMetadata>} The new Onshape metadata with the refreshed token information
 */
function refreshOnshapeToken(userRecord, metadata) {
    if(!metadata?.refresh_token) throw new BadRequestError("Missing Onshape refresh token");

    const body = new URLSearchParams({
        client_id: getRequiredConfigOption("onshape/clientId"),
        client_secret: getRequiredConfigOption("onshape/clientSecret"),
        grant_type: "refresh_token",
        refresh_token: metadata.refresh_token,
    });

    const res = $http.send({
        url: ONSHAPE_TOKEN_URL,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        timeout: 10,
    });

    if(!res || res.statusCode >= 400) {
        throw new InternalServerError(`Onshape token refresh failed with status ${res?.statusCode ?? "unknown"}`);
    }

    return setOnshapeMetadata(userRecord, res.json());
}

/**
 * Get the user's Onshape token from their record metadata and refresh it if it's expired or
 * close to expiring. Returns the valid token metadata.
 * @param {core.Record} userRecord The user's record to get the token metadata from and update if necessary
 * @returns {ReturnType<typeof getOnshapeMetadata>} The user's valid Onshape token metadata
 * @throws {Error} If the user doesn't have Onshape metadata or if refreshing the token fails
 */
function getValidOnshapeToken(userRecord) {
    const metadata = getOnshapeMetadata(userRecord);
    if(!metadata?.access_token) {
        throw new BadRequestError("Missing Onshape access token");
    }

    const expiresAt = Number(metadata.expires_at || 0);
    // less than a minute away is completely arbitrary idk
    const needsRefresh = !expiresAt || expiresAt <= Date.now() + 60 * 1000;
    if(needsRefresh) {
        return refreshOnshapeToken(userRecord, metadata);
    }

    return metadata;
}

/**
 * /api/onshape/oauth handles the initial OAuth redirect flow; there are two kinds of requests we receive:
 * - The user's redirect from our app, which sends them to Onshape to authorize. This part could technically
 *   be done from the frontend, but an API call makes it more consistent and simpler.
 * - The redirect back from Onshape, which includes our new authorization code and other information. We store
 *   this information in the user's record's `onshape_oauth` field and redirect back to their original path.
 * The initial request should include a `returnTo` query parameter, which we'll encode in the OAuth state
 * and use to redirect the user back on return. If missing, "/" will be used instead.  
 * The initial request should also include a `baseUri` query parameter, which is the base URI of the page
 * making the request. This should be the path that the API is initially called from. We could technically
 * use the request's origin or referrer for this, but I'm making the completely uneducated guess that that
 * has edge cases like when behind proxies or something.
 */
routerAdd("GET", "/api/onshape/oauth", (e) => {
    const authRecord = /** @type core.Record */ (e.requestInfo().auth);

    const query = e.request?.url?.query();
    if(!query) throw new BadRequestError("Missing query parameters");
    
    const code = query?.get("code"); // Only present on the redirect back from Onshape
    if(!code) {
        const baseUri = query.get("baseUri"); // Only present on the initial request
        if(!baseUri) throw new BadRequestError("Missing baseUri query parameter");
        
        const returnTo = query.get("returnTo") ?? "/"; // Only present on the initial request
        return e.redirect(302, buildAuthorizeUrl(
            `${baseUri}/api/onshape/oauth`,
            encodeXSRF(authRecord.id, returnTo)
        ));
    }

    const state = query.get("state");
    if(!state) throw new BadRequestError("Missing state query parameter");
    const xsrfData = decodeXSRF(state);
    if(!xsrfData) throw new BadRequestError("Invalid state parameter");
    if(xsrfData.userId !== authRecord.id) throw new BadRequestError("XSRF user ID mismatch");

    const returnTo = xsrfData.returnTo;
    const tokenJson = exchangeAuthorizationCode(code);
    setOnshapeMetadata(authRecord, tokenJson);

    return e.redirect(302, returnTo);
}, $apis.requireAuth());

/**
 * /api/onshape/{{action}} is a proxy endpoint for making authenticated API requests to Onshape.
 * Unfortunately, the Onshape API has strict CORS headers which prevent us from making the requests
 * from the web client. Here, we make the request if possible or tell the client to authenticate if
 * no valid Onshape OAuth state exists for the user.  
 * It should be called like `GET /api/onshape/v16/documents` to proxy to the Onshape API endpoint
 * `/api/v16/documents`.
 */
routerAdd("GET", "/api/onshape/{path...}", (e) => {
    const authRecord = /** @type core.Record */ (e.requestInfo().auth);

    const path = e.request?.pathValue("path");
    if(!path) throw new BadRequestError("Missing path parameter");

    const metadata = getValidOnshapeToken(authRecord);
    if(!metadata) throw new BadRequestError("User is missing Onshape OAuth metadata");
    
    const baseOnshapeUrl = getRequiredConfigOption("onshape/baseDomain");

    const res = $http.send({
        url: `${baseOnshapeUrl}/${path}`,
        method: "GET",
        headers: {
            "Authorization": `Bearer ${metadata.access_token}`,
        },
        timeout: 10,
    });

    if(!res) throw new InternalServerError("No response from Onshape");
    
    return e.json(res.json, res.statusCode);
}, $apis.requireAuth());