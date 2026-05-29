// @ts-nocheck

const _browser = globalThis.browser ?? globalThis.chrome;

window.addEventListener("message", async (event) => {
    // TODO: Eventually check event.origin here; fine for development

    const data = event.data;
    if(data?.type === "kanshapePing") {
        event.source.postMessage({
            type: "kanshapePong",
            id: data.id,
        }, event.origin);

        return;
    }

    if(data?.type !== "kanshapeProxyFetch") {
        return;
    }

    try {
        const response = await _browser.runtime.sendMessage({
            type: "kanshapeProxyFetch",
            payload: data.payload,
        });

        if(response.error) {
            throw new Error(response.error);
        }

        event.source.postMessage({
            type: "kanshapeProxyFetchResponse",
            id: data.id,
            response,
        }, event.origin);
    } catch(err) {
        event.source.postMessage({
            type: "kanshapeProxyFetchResponse",
            id: data.id,
            error: err.message,
        }, event.origin);
    }
});