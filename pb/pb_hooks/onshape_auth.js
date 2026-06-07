// @ts-check
/// <reference path="../pb_data/types.d.ts" />

const ONSHAPE_AUTHORIZE_URL = "https://oauth.onshape.com/oauth/authorize";
const ONSHAPE_TOKEN_URL = "https://oauth.onshape.com/oauth/token";
const ONSHAPE_SCOPES = "OAuth2Read OAuth2Write OAuth2ReadPII";

const OAUTH_TRANSACTION_COLLECTION = "oauth_transactions";
const OAUTH_TRANSACTION_MAX_AGE_MS = 60 * 60 * 1000; // an hour is probably a lot but eh

// I'm not 100% certain on this, but Onshape's OAuth endpoints seem to faithfully follow
// RFC 6749 (The OAuth 2.0 Authorization Framework), so I'm making requests according to that.
// Their docs don't cover all API details, but they use passport which implements the normal
// flow. See their docs here: https://onshape-public.github.io/docs/auth/oauth/

const { getRequiredConfigOption } = require(`${__hooks}/config`);

// XSRF handling
// Maybe I'm not doing this right, but the point of the OAuth `state` parameter is to store a persistent
// identifier for the transaction on the server so that when the user is redirected back to the callback URL,
// we can look up the transaction and verify that it matches the user who initiated it. It should be opaque
// and unguessable, so we just use the record id of a server-side record.
// See https://developers.google.com/identity/openid-connect/openid-connect?hl=en#createxsrftoken for
// a much better example on what XSRF protection should look like in an OAuth flow (though of course
// we're not using Google OAuth)

/**
 * Normalize a return path so we never redirect to an external URL.
 * @param {unknown} returnTo The requested return path.
 * @returns {string} A safe internal path.
 */
function normalizeReturnTo(returnTo) {
    if(typeof returnTo !== "string") return "/";
    const trimmed = returnTo.trim();
    if(!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";

    return trimmed;
}

/**
 * Build the callback URL that Onshape should redirect back to.
 * @param {http.Request} request The incoming request.
 * @param {core.RequestInfo} requestInfo Parsed request info.
 * @returns {string} The absolute callback URL.
 */
function getCallbackUrl(request, requestInfo) {
    if(!request.url) throw new BadRequestError("Missing request URL");
    /** @type import('./url') */
    const { URL } = require(`${__hooks}/url`);

    // Unfortunately, we can't get the origin from the request URL - it's relative. Instead,
    // we look at the Host header, which we make sure to set on the client.
    let host = requestInfo.headers["x_forwarded_host"] ?? request.host;
    if(!host) throw new BadRequestError("Missing Host header");
    // Onshape doesn't allow redirects to 127.0.0.1
    host = host.replace("127.0.0.1", "localhost");

    const protocol = requestInfo.headers["x_forwarded_proto"] ?? "http";
    const callbackUrl = new URL(protocol + "://" + host);
    callbackUrl.pathname = "/api/onshape/oauth";
    callbackUrl.search = "";
    callbackUrl.hash = "";
    return callbackUrl.toString();
}

/**
 * Create a new server-side OAuth transaction record.
 * @param {core.Record} userRecord The authenticated user starting the flow.
 * @param {string} returnTo The path to redirect back to after OAuth completes.
 * @param {string} redirectUri The redirect URI to use for the OAuth flow.
 * @returns {core.Record} The saved transaction record.
 */
function createOnshapeTransaction(userRecord, returnTo, redirectUri) {
    const transaction = new Record($app.findCollectionByNameOrId(OAUTH_TRANSACTION_COLLECTION));
    transaction.set("user", userRecord.id);
    transaction.set("provider", "onshape");
    transaction.set("return_to", normalizeReturnTo(returnTo));
    transaction.set("redirect_uri", redirectUri);
    $app.save(transaction);
    return transaction;
}

/**
 * Load and validate an OAuth transaction record.
 * @param {string} transactionId The transaction record id from the OAuth state parameter.
 * @returns {{
 *     transaction: core.Record;
 *     userId: string;
 *     returnTo: string;
 *     redirectUri: string;
 * }} The validated transaction details.
 */
function loadOnshapeTransaction(transactionId) {
    try {
        const transaction = $app.findRecordById(OAUTH_TRANSACTION_COLLECTION, transactionId);
        if(transaction.get("provider") !== "onshape") {
            throw new BadRequestError("Invalid OAuth transaction provider");
        }

        const userId = transaction.get("user");
        if(typeof userId !== "string" || !userId) {
            throw new BadRequestError("OAuth transaction is missing a user");
        }

        const redirectUri = transaction.get("redirect_uri");
        if(typeof redirectUri !== "string" || !redirectUri) {
            throw new BadRequestError("OAuth transaction is missing a redirect URI");
        }

        return {
            transaction,
            userId,
            returnTo: normalizeReturnTo(transaction.get("return_to")),
            redirectUri
        };
    } catch(err) {
        throw new BadRequestError("Invalid or expired OAuth transaction");
    }
}

/**
 * Get the user's Onshape OAuth metadata from their record. This is where we store the access token,
 * refresh token, expiration, etc.
 * @param {core.Record} userRecord The user's record to get the metadata from
 * @returns {{
 *     access_token: string;
 *     refresh_token: string;
 *     token_type: string;
 *     expires_in: number;
 *     expires_at: number;
 *     scope: string;
 * } | null} The user's Onshape metadata, or null if not found
 */
function getOnshapeMetadata(userRecord) {
    /** @type import("./util") */
    const { parseJSON } = require(`${__hooks}/util`);
    const metadata = parseJSON(userRecord.get("onshape_oauth"));
    return metadata;
}

/**
 * Set the user's Onshape OAuth metadata in their record
 * @param {core.Record} record The user's record to update
 * @param {{
 *     access_token: string;
 *     refresh_token?: string;
 *     token_type: string;
 *     expires_in: number;
 *     scope: string;
 * }} tokenJson The token information to store. Comes from Onshape directly.
 * @returns {{
 *     access_token: string;
 *     refresh_token: string;
 *     token_type: string;
 *     expires_in: number;
 *     expires_at: number;
 *     scope: string;
 * }} The updated Onshape metadata.
 */
function setOnshapeMetadata(record, tokenJson) {
    const existingMetadata = record.get("onshape_oauth") || {};
    const expiresIn = Number(tokenJson.expires_in || 0);
    const metadata = {
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token ?? existingMetadata.refresh_token ?? "",
        token_type: tokenJson.token_type,
        expires_in: expiresIn,
        expires_at: Date.now() + (expiresIn ? expiresIn * 1000 : 0),
        scope: tokenJson.scope,
    };
    record.set("onshape_oauth", metadata);
    $app.save(record);

    return metadata;
}

/**
 * Build the Onshape OAuth authorization URL with the necessary query parameters
 * @param {string} redirectUri The URI to redirect back to after authorization (must match the one registered in Onshape exactly)
 * @param {string} state The state parameter for XSRF protection and returning to the correct page
 */
function buildAuthorizeUrl(redirectUri, state) {
    /** @type import("./url") */
    const { URL } = require(`${__hooks}/url`);

    const url = new URL(ONSHAPE_AUTHORIZE_URL);
    url.searchParams.set("response_type", "code"); // not sure this is required but it works
    url.searchParams.set("client_id", getRequiredConfigOption("onshape/clientId"));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", ONSHAPE_SCOPES);
    url.searchParams.set("state", state);

    return url.toString();
}

/**
 * Send a token request to Onshape and return the parsed response.
 * @param {import("./url").URLSearchParams} body The URL-encoded request body.
 * @param {string} errorMessage The error message to use if the token request fails.
 * @returns {any} The parsed JSON token response.
 */
function sendTokenRequest(body, errorMessage) {
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
        console.log("Token request failed { status: " + res?.statusCode + ", body: " + res?.raw + "}");
        throw new InternalServerError(`${errorMessage} with status ${res?.statusCode ?? "unknown"}`);
    }

    return res.json;
}

/**
 * Exchange an authorization code for an access token and refresh token. Onshape's OAuth endpoint requires
 * this two-step process where the initial redirect gives an authorization code and we separately get a token
 * because the server is the one who actually sends the client ID and secret, not the client.
 * @param {string} code The authorization code returned by Onshape.
 * @param {string} redirectUri The redirect URI used for the authorization request.
 * @returns {any} The parsed token response from Onshape.
 */
function exchangeAuthorizationCode(code, redirectUri) {
    /** @type {typeof import("./url")} */
    const { URLSearchParams } = require(`${__hooks}/url`);

    const body = new URLSearchParams({
        client_id: getRequiredConfigOption("onshape/clientId"),
        client_secret: getRequiredConfigOption("onshape/clientSecret"),
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
    });

    return sendTokenRequest(body, "Onshape authorization exchange failed");
}

/**
 * Refresh the user's Onshape token from their Onshape metadata. Updates the user's record and returns
 * the new token metadata.
 * @param {core.Record} userRecord The user's record to update with the new token information
 * @param {ReturnType<typeof getOnshapeMetadata>} metadata The user's current Onshape metadata, which should include the refresh token.
 *   Passed in separately from userRecord so we don't make extra database calls.
 * @returns {{
 *     access_token: string;
 *     refresh_token: string;
 *     token_type: string;
 *     expires_in: number;
 *     expires_at: number;
 *     scope: string;
 * }} The new Onshape metadata with the refreshed token information
 */
function refreshOnshapeToken(userRecord, metadata) {
    if(!metadata?.refresh_token) throw new BadRequestError("Missing Onshape refresh token");

    /** @type {typeof import("./url")} */
    const { URLSearchParams } = require(`${__hooks}/url`);

    const body = new URLSearchParams({
        client_id: getRequiredConfigOption("onshape/clientId"),
        client_secret: getRequiredConfigOption("onshape/clientSecret"),
        grant_type: "refresh_token",
        refresh_token: metadata.refresh_token,
    });

    return setOnshapeMetadata(userRecord, sendTokenRequest(body, "Onshape token refresh failed"));
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
 * Periodically remove stale OAuth transactions so abandoned sign-ins do not accumulate forever.
 */
function cleanupExpiredOnshapeTransactions() {
    const cutoff = Date.now() - OAUTH_TRANSACTION_MAX_AGE_MS;
    const transactions = $app.findAllRecords(OAUTH_TRANSACTION_COLLECTION);

    for(const transaction of transactions) {
        if(!transaction) continue;

        const createdAt = Date.parse(String(transaction.get("created") ?? ""));
        if(Number.isFinite(createdAt) && createdAt < cutoff) {
            try {
                $app.delete(transaction);
            } catch(err) {
                console.warn("Failed to delete expired Onshape OAuth transaction:", err);
            }
        }
    }
}

module.exports = {
    createOnshapeTransaction,
    loadOnshapeTransaction,
    getCallbackUrl,
    buildAuthorizeUrl,
    exchangeAuthorizationCode,
    getOnshapeMetadata,
    setOnshapeMetadata,
    getValidOnshapeToken,
    cleanupExpiredOnshapeTransactions
};