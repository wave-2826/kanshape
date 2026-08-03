// @ts-check
/// <reference path="../pb_data/types.d.ts" />

onRecordAuthWithOAuth2Request((e) => {
    try {
        const { getConfigOption } = /** @type {import("./config")} */(require(`${__hooks}/config.js`));
        const oAuthAdminGroups = getConfigOption("auth/oAuthAdminGroups", "");
        const adminGroups = oAuthAdminGroups.split(",").map(g => g.trim()).filter(g => g.length > 0);

        const userGroups = e.oAuth2User?.rawUser?.groups;

        if(!userGroups || !Array.isArray(userGroups)) {
            console.warn("No user groups found for OAuth2 user");
            return;
        }

        const isAdmin = userGroups.some(g => adminGroups.includes(g));
        // e.record is already set here i guess
        if(e.record && isAdmin) {
            e.record.set("is_admin", true);
            e.app.save(e.record);
        }
    } catch(e) {
        console.error(`OAuth admin groups hook failed: ${e}`);
    }

    e.next();
});