import type { AppConfig } from "../config";

type OnshapeSelectionType = "BODY" | "ENTITY" | "FEATURE";
type OnshapeEntityType = "EDGE" | "FACE" | "VERTEX" | "DEGENERATE_EDGE" | "UNKNOWN";

type OnshapeSelection = {
    selectionId: string;
    selectionType: OnshapeSelectionType;
    entityType?: OnshapeEntityType;
    occurrencePath?: string;
    workspaceMicroversionId: string;
}

/**
 * See https://onshape-public.github.io/docs/app-dev/clientmessaging/ and
 * https://onshape-public.github.io/docs/app-dev/element-right-panel/#applicationinit
 */
type ClientToOnshapeMessage = {
    documentId: string,
    workspaceId: string,
    elementId: string,
} & ({
    messageName: "applicationInit"
} | {
    messageName: "keepAlive"
});

/**
 * Mostly reverse-engineered types since the documentation is poor
 */
type OnshapeToClientMessage = {
    messageName: "SELECTION",
    selections: OnshapeSelection[]
};

export class OnshapeClient {
    private boundHandleMessage: (event: MessageEvent) => void;
    private baseDomain: string;
    private keepAliveInterval: number | null = null;

    constructor(private config: AppConfig, private docId: string, private wvmId: string, private elementId: string) {
        this.baseDomain = this.config.onshape.baseDomain;
        this.boundHandleMessage = this.handleMessage.bind(this);
        window.addEventListener("message", this.boundHandleMessage);

        this.sendInitMessage();

        // keepAlive heartbeat
        // OnShape requires periodic keepAlive messages to keep the session alive
        // and to keep SELECTION events flowing after the initial handshake.
        this.keepAliveInterval = setInterval(() => {
            try {
                window.parent.postMessage(
                    {
                        messageName: "keepAlive",
                        documentId: docId,
                        workspaceId: wvmId,
                        elementId: elementId
                    },
                    this.baseDomain,
                );
            } catch (e) {}
        }, 25000); // every 25s, well within OnShape's session timeout
    }

    private sendInitMessage() {
        const initMsg = {
            messageName: "applicationInit",
            documentId: this.docId,
            workspaceId: this.wvmId,
            elementId: this.elementId
        };
        
        try {
            window.parent.postMessage(initMsg, this.baseDomain);
        } catch (e) {
            console.warn("applicationInit postMessage failed:", e);
        }
    }

    public dispose() {
        window.removeEventListener("message", this.boundHandleMessage);
        if(this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    }

    private handleMessage(event: MessageEvent) {
        if(event.origin !== this.baseDomain) {
            console.warn("Ignored message from unknown origin:", event.origin);
            return;
        }
        if(event.data.type && event.data.type.startsWith("kanshape")) return;

        const data = event.data as OnshapeToClientMessage;

        if(data && data.messageName) {
            switch(data.messageName) {
                case "SELECTION":
                    const selections = data.selections;
                    let selectedIds: string[] = [];
                    if(Array.isArray(selections) && selections.length > 0) {
                        selectedIds = selections.map((s) => {
                            if(typeof s === "string") return s;
                            return s.selectionId;
                        });
                    }

                    if(selectedIds.length > 0) {
                        // this.loadSelectedParts(selectedIds); // Call the load function with selected IDs
                    } else {
                        // console.log("No selected IDs found in message; skipping load.");
                    }
                    break;
                default:
                    // Ignore other messages
                    break;
            }
        } else {
            console.warn("Received message with unexpected format:", event.data);
        }
    }
}