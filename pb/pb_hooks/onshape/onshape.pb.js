// @ts-check
/// <reference path="../../pb_data/types.d.ts" />

/**
 * /api/onshape/oauth handles both the initial OAuth redirect and the callback from Onshape.
 * The initial request creates a server-side oauth_transactions record and uses its id as the OAuth state.
 * The callback looks up the transaction by id, exchanges the code for tokens, stores the connection, and
 * redirects the user to the stored return path.
 */
routerAdd("GET", "/api/onshape/oauth", (e) => {
    /** @type typeof import("./onshape_auth") } */
    const { createOnshapeTransaction, loadOnshapeTransaction, exchangeAuthorizationCode, setOnshapeMetadata, getCallbackUrl, buildAuthorizeUrl } =
        require(`${__hooks}/onshape/onshape_auth`);

    const query = e.request?.url?.query();
    if(!query) throw new BadRequestError("Missing query parameters");

    if(!e.request) throw new BadRequestError("Missing request information");

    const error = query.get("error");

    const code = query.get("code");
    if(!code && !error) {    
        const authRecord = /** @type core.Record */ (e.requestInfo().auth);
        // for jake :)
        if(!authRecord) {
            e.json(418, { error: "I'm a teapot", message: "authentication required to start Onshape OAuth flow" });
            return;
        }

        const callbackUrl = getCallbackUrl(e.request, e.requestInfo());
        const transaction = createOnshapeTransaction(authRecord, query.get("returnTo") ?? "/", callbackUrl);
        return e.json(200, buildAuthorizeUrl(callbackUrl, transaction.id));
    }

    const state = query.get("state");
    if(!state) throw new BadRequestError("Missing state query parameter");

    const transactionData = loadOnshapeTransaction(state);
    // Ideally, we would match the transaction user and auth record, but we don't have auth here

    if(error) {
        // onshape returned an oauth error; redirect back but maintain error and error_description
        const { URL } = /** @type typeof import("../url") */ (require(`${__hooks}/url`));
        let returnUrl = new URL(transactionData.returnTo);
        returnUrl.searchParams.set("oauth_error", error);
        returnUrl.searchParams.set("oauth_error_description", query.get("error_description") ?? "");
        try {
            $app.delete(transactionData.transaction);
        } catch(err) {
            console.warn("Failed to delete consumed Onshape OAuth transaction:", err);
        }
        return e.redirect(302, returnUrl.href);
    }

    const tokenJson = exchangeAuthorizationCode(code, transactionData.redirectUri);
    const userRecord = $app.findRecordById("users", transactionData.userId);
    setOnshapeMetadata(userRecord, tokenJson);

    try {
        $app.delete(transactionData.transaction);
    } catch(err) {
        console.warn("Failed to delete consumed Onshape OAuth transaction:", err);
    }

    return e.redirect(302, transactionData.returnTo);
});

/**
 * /api/onshape/{{action}} is a proxy endpoint for making authenticated API requests to Onshape.
 * Unfortunately, the Onshape API has strict CORS headers which prevent us from making the requests
 * from the web client. Here, we make the request if possible or tell the client to authenticate if
 * no valid Onshape OAuth state exists for the user.  
 * It should be called like `GET /api/onshape/v16/documents` to proxy to the Onshape API endpoint
 * `/api/v16/documents`.
 */

routerUse((e) => {
    if(e.request?.url?.path?.startsWith("/api/onshape/proxy/")) {
        if(!e.requestInfo().auth) {
            return e.json(401, { error: "unauthorized", message: "You must be logged in to use the Onshape proxy" });
        }
        /** @type {typeof import("./onshape_proxy")} */
        const { handleProxyRequest } = require(`${__hooks}/onshape/onshape_proxy`);
        return handleProxyRequest(e);
    }

    return e.next();
});

// temporary api routes
routerAdd("GET", "/api/test/webhook", (e) => {
    const { ensureWebhook } = /** @type {typeof import("./webhooks")} */ (require(`${__hooks}/onshape/webhooks`));
    
    const auth = e.requestInfo().auth;
    if(!auth) throw new UnauthorizedError("auth required");
    const query = e.requestInfo().query;
    if(!query.document_id) throw new BadRequestError("document_id required");

    console.log(JSON.stringify(ensureWebhook(auth, ["onshape.model.translation.complete"], {
        documentId: query.document_id
    })));

    return e.json(200, { ok: true });
});

cronAdd("cleanup_onshape_oauth_transactions", "*/15 * * * *", () => {
    require(`${__hooks}/onshape/onshape_auth`).cleanupExpiredOnshapeTransactions();
});

cronAdd("cleanup_onshape_request_cache", "*/15 * * * *", () => {
    require(`${__hooks}/onshape/onshape_proxy`).cleanupRequestCache();
});

// Enrich users records with their current onshape auth state so we can show it in the UI without sending everything
// or making extra requests
onRecordEnrich((e) => {
    /** @type typeof import("./onshape_auth") */
    const { getOnshapeMetadata } = require(`${__hooks}/onshape/onshape_auth`);

    if(!e.record) {
        e.next();
        return;
    }

    try {
        // add new custom field for registered users
        if(e.requestInfo?.auth?.collection()?.name == "users") {
            e.record.withCustomData(true) // for security custom props require to be enabled explicitly
            const oauthState = getOnshapeMetadata(e.requestInfo.auth);
            e.record.set("onshape_auth_expiry", oauthState?.access_token ? new Date(oauthState.expires_at).toISOString() : null);
        }
    } catch(err) {
        // never fail the request if we can't enrich the record, just log it
        console.error("Failed to enrich user record with Onshape auth state:", err);
    }

    e.next();
}, "users");
