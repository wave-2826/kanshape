// @ts-check
/// <reference path="../pb_data/types.d.ts" />

routerUse(new Middleware((e) => {
    e.response.header().set("Content-Security-Policy", "frame-ancestors 'self' https://*.onshape.com");
    return e.next();
}));