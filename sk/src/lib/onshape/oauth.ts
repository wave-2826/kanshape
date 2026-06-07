import { client } from "$lib/pocketbase";

export async function onshapeOAuth() {
    try {
        const response = await client.send("/api/onshape/oauth", {
            method: "GET",
            query: {
                returnTo: window.location.pathname + window.location.search
            },
            headers: {
                // If we're not behind a proxy
                // Probably not the right way to do this but oh well
                "X-Forwarded-Proto": window.location.protocol.replace(":", ""),
                'X-Forwarded-Host': window.location.host
            }
        });

        window.location.href = response;
    } catch(error) {
        console.error("OAuth failed", error);
    }
}