/// <reference path="../pb_data/types.d.ts" />

/**
 * Onshape OAuth handler
 * 
 * Handles exchanging OAuth authorization codes for access tokens
 * and storing them in the user's metadata.
 */



routerAdd(
  "GET",
  "/api/hello_onshape",
  (e) => {
    $apis.requireAuth();
    try {
      // Get the code from query params
      const code = e.request.url.query().get("code");
      let client_id = $app.findFirstRecordByData("config", "key", "onshape/clientId");
      let client_secret = $app.findFirstRecordByData("config", "key", "onshape/clientSecret");
      let redirect_uri = $app.findFirstRecordByData("config", "key", "onshape/redirectUri");
      let onshape_base_domain = $app.findFirstRecordByData("config", "key", "onshape/baseDomain").get("value");
      if (!onshape_base_domain) {onshape_base_domain = "https://cad.onshape.com"} // Default to public Onshape domain if not set
      let company_id = onshape_base_domain.split("//")[1].split(".")[0]; // Extract company ID from base domain
      let authRecord = e.requestInfo().auth;
      if (!code) {
        return e.redirect(302, `https://oauth.onshape.com/oauth/confirm_access?response_type=code&client_id=${encodeURIComponent(client_id.get("value"))}&redirect_uri=${encodeURIComponent(redirect_uri.get("value"))}&scope=OAuth2Read%20OAuth2ReadPII&company_id=${encodeURIComponent(company_id)}`)
      }


      const params = `client_id=${encodeURIComponent(client_id.get("value"))}&client_secret=${encodeURIComponent(client_secret.get("value"))}&code=${encodeURIComponent(code)}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(redirect_uri.get("value"))}`;

      const res = $http.send({
        url: "https://oauth.onshape.com/oauth/token",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
        Timeout: 5
      })

      let metadata = authRecord?.get("metadata");
      metadata.onshape = {
        access_token: res.json().access_token,
        token_type: res.json().token_type,
        expires_in: res.json().expires_in,
        scope: res.json().scope,
      }
      authRecord.set("metadata", metadata);
      $app.save(authRecord);

      return e.json(200, {"res": res, "code": res.statusCode});
    } catch (err) {
      console.error("Error parsing query params:", err);
      return e.json(400, {"error": "Invalid request"});
    }
  }
);
