// @ts-check
/// <reference path="../pb_data/types.d.ts" />

/**
 * /api/onshape/oauth handles both the initial OAuth redirect and the callback from Onshape.
 * The initial request creates a server-side oauth_transactions record and uses its id as the OAuth state.
 * The callback looks up the transaction by id, exchanges the code for tokens, stores the connection, and
 * redirects the user to the stored return path.
 */
routerAdd("GET", "/api/onshape/oauth", (e) => {
    /** @type typeof import("./onshape_auth") } */
    const { createOnshapeTransaction, loadOnshapeTransaction, exchangeAuthorizationCode, setOnshapeMetadata, getCallbackUrl, buildAuthorizeUrl } = require(`${__hooks}/onshape_auth`);

    const query = e.request?.url?.query();
    if(!query) throw new BadRequestError("Missing query parameters");

    if(!e.request) throw new BadRequestError("Missing request information");

    const code = query.get("code");
    if(!code) {    
        const authRecord = /** @type core.Record */ (e.requestInfo().auth);
        // for jake :)
        if(!authRecord) e.json(418, { error: "I'm a teapot", message: "authentication required to start Onshape OAuth flow" });

        const callbackUrl = getCallbackUrl(e.request, e.requestInfo());
        const transaction = createOnshapeTransaction(authRecord, query.get("returnTo") ?? "/", callbackUrl);
        return e.json(200, buildAuthorizeUrl(callbackUrl, transaction.id));
    }

    const state = query.get("state");
    if(!state) throw new BadRequestError("Missing state query parameter");


    const transactionData = loadOnshapeTransaction(state);
    // Ideally, we would match the transaction user and auth record, but we don't have auth here

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
        if(!e.request) throw new BadRequestError("Missing request information");

        /** @type import("./config") */
        const { getConfigOption } = require(`${__hooks}/config`);
        /** @type import("./onshape_auth") */
        const { getValidOnshapeToken } = require(`${__hooks}/onshape_auth`);

        const authRecord = /** @type core.Record */ (e.requestInfo().auth);
        if(!authRecord) throw new BadRequestError("Authentication required to access Onshape API");

        const path = e.request.url.path.replace("/api/onshape/", "") + "?" + (e.request.url.rawQuery ?? ""); // preserve query parameters
        
        const metadata = getValidOnshapeToken(authRecord);
        if(!metadata) throw new BadRequestError("User is missing Onshape OAuth metadata");
        
        const baseOnshapeUrl = getConfigOption("onshape/baseDomain", "https://cad.onshape.com").replace(/\/+$/, ""); // remove trailing slashes just in case

        const content = e.requestInfo().body.content;

        const res = $http.send({
            url: `${baseOnshapeUrl}/api/${path}`,
            method: e.request.method,
            headers: {
                "Authorization": `Bearer ${metadata.access_token}`,
                // Forward content-type header if present, otherwise Onshape will reject the request
                "Content-Type": e.request.header.get("Content-Type") ?? "application/json",
                "X-XSRF-TOKEN": e.request.header.get("X-XSRF-TOKEN") ?? "",
                "Accept": e.request.header.get("Accept") ?? "application/json;charset=UTF-8; qs=0.09"
            },
            body: content,
            timeout: 10,
        });

        if(!res) throw new InternalServerError("No response from Onshape");
        
        // Copy headers to response
        for(const [key, value] of Object.entries(res.headers)) {
            for(const v of Array.isArray(value) ? value : [value]) {
                e.response.header().add(key, v);
            }
        }
        return e.json(res.statusCode, res.json);
    }

    return e.next();
});

// routerAdd("GET", "/api/onshape/{path...}",
//     (e) => require(`${__hooks}/onshape_auth`).proxyOnshapeRequest(e, e.requestInfo()), $apis.requireAuth());
// routerAdd("POST", "/api/onshape/{path...}",
//     (e) => require(`${__hooks}/onshape_auth`).proxyOnshapeRequest(e, e.requestInfo()), $apis.requireAuth());
// routerAdd("PUT", "/api/onshape/{path...}",
//     (e) => require(`${__hooks}/onshape_auth`).proxyOnshapeRequest(e, e.requestInfo()), $apis.requireAuth());
// routerAdd("DELETE", "/api/onshape/{path...}",
//     (e) => require(`${__hooks}/onshape_auth`).proxyOnshapeRequest(e, e.requestInfo()), $apis.requireAuth());


cronAdd("cleanup_onshape_oauth_transactions", "*/15 * * * *", () => {
    require(`${__hooks}/onshape_auth`).cleanupExpiredTransactions();
});

// Enrich users records with their current onshape auth state so we can show it in the UI without sending everything
// or making extra requests
onRecordEnrich((e) => {
    /** @type import("./onshape_auth") */
    const { getOnshapeMetadata } = require(`${__hooks}/onshape_auth`);

    if(!e.record) {
        e.next();
        return;
    }

    // add new custom field for registered users
    if(e.requestInfo?.auth?.collection()?.name == "users") {
        e.record.withCustomData(true) // for security custom props require to be enabled explicitly
        const oauthState = getOnshapeMetadata(e.requestInfo.auth);
        e.record.set("onshape_auth_expiry", oauthState?.access_token ? new Date(oauthState.expires_at).toISOString() : null);
    }

    e.next();
}, "users");
