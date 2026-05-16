<script lang="ts">
    import { metadata } from "$lib/metadata";
    import { client } from "$lib/pocketbase";

    $effect(() => {
        $metadata.title = "Onshape Side Panel";
    });

    console.log("OnShape panel script loaded");
    let docId = "",
        wvmType = "w",
        wvmId = "",
        elementId = "",
        osServer = "https://cad.onshape.com";

    window.addEventListener("message", handleOnShapeMessage);

    initOnShape();

    function handleOnShapeMessage(event: MessageEvent) {
        if (event.origin !== osServer) {
            console.warn("Ignored message from unknown origin:", event.origin);
            return;
        }
        const data = event.data;
        if (data && data.messageName) {
            console.log("Received message from OnShape:", data);
            // Handle specific messages as needed
            switch (data.messageName) {
                case "SELECTION":
                    // Example: handle selection changes — normalize different payload shapes
                    const selectedFromField = data.selectedIds;
                    const selections = data.selections;
                    let selectedIds: string[] = [];
                    if (Array.isArray(selectedFromField) && selectedFromField.length > 0) {
                        selectedIds = selectedFromField;
                    } else if (Array.isArray(selections) && selections.length > 0) {
                        selectedIds = selections.map((s) => {
                            if (typeof s === "string") return s;
                            return s.id ?? s.entityId ?? JSON.stringify(s);
                        });
                    }
                    console.log("Selection changed:", selectedIds);
                    if (selectedIds.length > 0) {
                        loadSelectedParts(selectedIds); // Call the load function with selected IDs
                    } else {
                        console.log("No selected IDs found in message; skipping load.");
                    }
                    break;
                // Add more cases for other message types if needed
                default:
                    console.log("Unhandled message type:", data.messageName);
            }
        } else {
            console.warn("Received message with unexpected format:", event.data);
        }
    }

    function initOnShape() {
        let keepAliveInterval: number | null = null;
        const p = new URLSearchParams(window.location.search);
        docId = p.get("documentId") || "";
        wvmId = p.get("workspaceId") || p.get("versionId") || "";
        wvmType = p.get("versionId") ? "v" : "w";
        elementId = p.get("elementId") || "";
        // Target origin for postMessage — hardcoded to cad.onshape.com.
        // {$server} is NOT a valid OnShape Action URL token and will not be substituted.
        osServer = "https://cad.onshape.com";
        // {$selectedPartIds} is a snapshot of what was selected when the panel icon was clicked
        const selectedParam = p.get("selectedPartIds") || "";
        let studioSelectedIds: string[] = selectedParam
            ? selectedParam.split(",").filter(Boolean)
            : [];
        console.log("initOnShape — URL params:", {
            docId,
            wvmType,
            wvmId,
            elementId,
            osServer,
            selectedCount: studioSelectedIds.length,
        });
        if (docId && wvmId && elementId) {
            const docLabel = document.getElementById("doc-label");
            const docInfo = document.getElementById("doc-info");
            if (docLabel) docLabel.textContent = docId.substring(0, 8) + "...";
            if (docInfo)
                docInfo.textContent = "doc: " + docId.substring(0, 12) + "…";
            // ── Send applicationInit with REAL IDs ──────────────────────────────────
            // OnShape docs: "Post a message on startup — Onshape will not post messages until
            // a newly started extension has first posted a valid message."
            // Empty IDs in the early init were being silently rejected. This is the fix.
            const initMsg = {
                messageName: "applicationInit",
                documentId: docId,
                workspaceId: wvmId,
                elementId: elementId,
            };
            console.log("Sending applicationInit with real IDs to", osServer);
            try {
                window.parent.postMessage(initMsg, osServer);
            } catch (e) {
                console.warn("applicationInit postMessage failed:", e);
            }
            // ── keepAlive heartbeat ─────────────────────────────────────────────────
            // OnShape requires periodic keepAlive messages to keep the session alive
            // and to keep SELECTION events flowing after the initial handshake.
            if (keepAliveInterval) clearInterval(keepAliveInterval);
            keepAliveInterval = setInterval(() => {
                try {
                    window.parent.postMessage(
                        {
                            messageName: "keepAlive",
                            documentId: docId,
                            workspaceId: wvmId,
                            elementId: elementId,
                        },
                        osServer,
                    );
                } catch (e) {}
            }, 25000); // every 25s — well within OnShape's session timeout
            // Show banner if parts were pre-selected via URL snapshot
            if (studioSelectedIds.length > 0) {
                `${studioSelectedIds.length} part${studioSelectedIds.length !== 1 ? "s" : ""} selected in Part Studio`;
            }
        } else {
            console.warn(
                "No URL params — check Action URL includes {$documentId}, {$workspaceId}, {$elementId}, {$selectedPartIds}, {$server}",
            );
        }
    }

    function loadSelectedParts(selectedIds: string[]) {
        console.log("Loading selected parts:", selectedIds);
        // Call the load function from proxy+layout with the selected part IDs
        client.send(`/api/onshape?path=/v6/parts/d/${docId}/${wvmType}/${wvmId}/e/${elementId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Include authentication headers if required
            },
            body: JSON.stringify({ selectedIds }),
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("Load response:", data);
                // Handle the response from the load function as needed
            })
            .catch((error) => {
                console.error("Error loading selected parts:", error);
            });
    }
</script>

<h1>This is onshape trust :D</h1>
