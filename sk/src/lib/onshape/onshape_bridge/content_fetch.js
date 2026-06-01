// @ts-nocheck
(function() {
    // Get native fetch by evaluating in global scope to bypass wrappers
    // Don't send our own code to onshape's error tracking... . oops. sorry onshape :( please forgive me
    const originalFetch = Function('return fetch')();

    // Check if fetch has been wrapped
    if(window.fetch !== originalFetch) {
        console.warn('!!! Fetch wrapped by page scripts', window.fetch, originalFetch);
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if(parts.length === 2) return parts.pop().split(';').shift();
    }

    window.addEventListener("message", async (event) => {
        if(event.source !== window) return;

        const msg = event.data;

        if(msg?.type !== "kanshapePageFetch") {
            return;
        }

        try {
            const headers = new Headers(msg.payload.headers || {});
            headers.set("X-XSRF-TOKEN", getCookie("XSRF-TOKEN") || "");

            const response = await originalFetch(msg.payload.url, {
                method: msg.payload.method || "GET",
                headers: headers,
                body: msg.payload.body,
                credentials: "include"
            });
            
            const text = await response.text();
            
            window.postMessage({
                type: "kanshapePageFetchResponse",
                requestId: msg.requestId,
                response: {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: text
                }
            });
        } catch(err) {
            window.postMessage({
                type: "kanshapePageFetchResponse",
                requestId: msg.requestId,
                error: err.message
            });
        }
    });
})();