import { get, writable, type Writable } from "svelte/store";
import type { AppConfig } from "../config";
import createClient from "openapi-fetch";
import { ONSHAPE_CUSTOM_BODY_SYMBOL, onshapeApiFetch } from "./requests";
import type { paths } from "./schema";
import type { PartSelection } from "$lib/components/parts/partData";
import { showAlert } from "$lib/site";

type OnshapeSelectionType = "BODY" | "ENTITY" | "FEATURE" | "OCCURRENCE" | "ROLLBACKBAR" | "MATE_CONNECTOR";
type OnshapeEntityType = "EDGE" | "FACE" | "VERTEX" | "DEGENERATE_EDGE" | "UNKNOWN";

export type OnshapeSelection = {
    selectionType: OnshapeSelectionType;
    selectionId: string;
    entityType?: OnshapeEntityType;
    occurrencePath?: string[];
    workspaceMicroversionId: string;
}

type RequestSelectionType = "VERTEX" | "EDGE" | "FACE" | "BODY" | "DEGENERATE_EDGE" | "UNKNOWN";
type RequestEntityType = "VERTEX" | "EDGE" | "FACE" | "BODY" | "DEGENERATE_EDGE" | "UNKNOWN";
type RequestBodyType = "SOLID" | "SHEET" | "WIRE" | "POINT" | "MATE_CONNECTOR" | "COMPOSITE" | "UNKNOWN";
type RequestGeometryType = "LINE" | "CIRCLE" | "ARC" | "PLANE" | "CYLINDER" | "CONE" | "SPHERE" | "TORUS" | "SPLINE" | "ELLIPSE" | "MESH" | "CONIC" | "REVOLVED" | "EXTRUDED" | "ALL_MESH" | "MIXED_MESH" | "SPLINE_INTERNAL_POINT" | "SPLINE_CONTROL_POLYGON" | "ELLIPTICAL_ARC" | "UNKNOWN";

type RequestSelectionHighlightItem = {
    selectionType: "ENTITY";
    selectionId: string;
    entityType: RequestEntityType;
} | {
    selectionType: "BODY";
    selectionId: string;
    bodyType: RequestBodyType;
} | {
    selectionType: "GEOMETRY";
    selectionId: string;
    geometryType: RequestGeometryType;
};

/**
 * See https://onshape-public.github.io/docs/app-dev/clientmessaging/ and
 * https://onshape-public.github.io/docs/app-dev/element-right-panel/#applicationinit.
 * documentId, workspaceId, and elementId are added by default in sendToOnshape().
 */
type ClientToOnshapeMessage = {
    messageName: "applicationInit"
} | {
    messageName: "keepAlive"
} | {
    messageName: "requestSelectionHighlight";
    messageId: string;
    selections: RequestSelectionHighlightItem[];
} | {
    messageName: "requestSelection";
    messageId: string;
    entityTypeSpecifier: RequestSelectionType[];
    requiredSelectionCount?: number;
} | {
    messageName: "stopRequest";
} | {
    messageName: "showMessageBubble";
    message: string;
} | {
    messageName: "openSelectItemDialog";
    dialogTitle?: string;
    selectAssemblies?: boolean;
    selectBlobs?: boolean;
    selectBlobMimeTypes?: string;
    selectMultiple?: boolean;
    selectParts?: boolean;
    selectPartStudios?: boolean;
    showBrowseDocuments?: boolean;
    showStandardContent?: boolean;
} | {
    messageName: "closeSelectItemDialog";
} | {
    messageName: "openAnotherElementInCurrentWorkspace";
    anotherElementId: string;
};

type ItemSelectedMessage = {
    messageName: 'itemSelectedInSelectItemDialog',
    documentId: string,
    documentMicroversionId: string,
    workspaceId: string, // sends workspaceId OR versionId
    versionId: string,  // sends workspaceId OR versionId
    elementId: string,
    elementName: string,
    elementType: string,
    elementMicroversionId: string,
    elementConfiguration: string,
    itemType: string,
    partName?: string,
    idTag?: string,
    includeSurfaces?: boolean,
    includeWires?: boolean,
    isSurface?: boolean,
    isFlattenedBody?: boolean,
    isComposite?: boolean,
    isSketch?: boolean,
    sketchIds?: string[],
    partNumber?: string, // only returned if a part is selected
    revision?: string,
    context?: string,
    isConfigurable?: boolean
};

/**
 * Mostly reverse-engineered types since the documentation is poor
 */
type OnshapeToClientMessage = {
    messageName: "SELECTION",
    selections: OnshapeSelection[]
} | {
    messageName: "REQUESTED_SELECTION",
    status: {
        statusCode: "PENDING" | "SUCCESS" | "STOPPED";
    },
    selections: OnshapeSelection[];
} | ItemSelectedMessage;

export type OnshapeLocation = "right-panel-part-studio" | "right-panel-assembly" | "tab" | null;

export class OnshapeClient {
    private boundHandleMessage: (event: MessageEvent) => void;
    private baseDomain: string;
    private keepAliveInterval: ReturnType<typeof setTimeout> | null = null;

    /** The transient entity IDs selected. */
    public selections: Writable<OnshapeSelection[]> = writable([]);

    public requests;

    private messageHandlers: { [message: string]: Set<(message: OnshapeToClientMessage) => void> } = {};

    constructor(
        private config: AppConfig,
        private readonly docId: string,
        private readonly wvm: "w" | "v" | "m",
        private readonly wvmId: string,
        private readonly elementId: string,
        private readonly location: OnshapeLocation
    ) {
        this.baseDomain = this.config.onshape.baseDomain;
        this.boundHandleMessage = this.handleMessage.bind(this);
        window.addEventListener("message", this.boundHandleMessage);

        this.requests = createClient<paths>({
            baseUrl: config.onshape.baseDomain + "/api/v16",
            fetch: onshapeApiFetch,
            // omg why do i need to mess with my fetch library i'm crashing out 😔
            Request: class extends Request {
                constructor(input: URL | string | Request, init?: RequestInit) {
                    super(input, init);
                    (this as any)[ONSHAPE_CUSTOM_BODY_SYMBOL] = init?.body ?? null;
                }
            }
        });

        this.sendInitMessage();

        // keepAlive heartbeat
        // OnShape requires periodic keepAlive messages to keep the session alive
        // and to keep SELECTION events flowing after the initial handshake.
        this.keepAliveInterval = setInterval(() => {
            try {
                this.sendToOnshape({
                    messageName: "keepAlive"
                });
            } catch (e) {}
        }, 25000); // every 25s, well within OnShape's session timeout
    }

    private sendInitMessage() {
        this.sendToOnshape({
            messageName: "applicationInit"
        });
    }

    private addMessageHandler<Type extends string>(
        name: Type,
        handler: (message: OnshapeToClientMessage & { messageName: Type }) => void
    ) {
        if(!this.messageHandlers[name]) this.messageHandlers[name] = new Set();
        this.messageHandlers[name].add(handler as any);
    }

    private removeMessageHandler<Type extends string>(
        name: Type,
        handler: (message: OnshapeToClientMessage & { messageName: Type }) => void
    ) {
        if(!this.messageHandlers[name]) return;
        this.messageHandlers[name].delete(handler as any);
    }

    private waitForMessage<Type extends OnshapeToClientMessage["messageName"]>(
        name: Type,
        timeoutMs: number = 5000
    ): Promise<OnshapeToClientMessage & { messageName: Type }> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.removeMessageHandler<Type>(name, handler);
                this.sendToOnshape({
                    messageName: "stopRequest"
                });
                reject(new Error(`Timeout waiting for message ${name}`));
            }, timeoutMs);

            const handler = (message: OnshapeToClientMessage & { messageName: Type }) => {
                if("status" in message) {
                    if(message.status.statusCode === "PENDING") {
                        // keep waiting
                        return;
                    } else if(message.status.statusCode === "STOPPED") {
                        clearTimeout(timeout);
                        this.removeMessageHandler<Type>(name, handler);
                        reject(new Error(`Selection request was stopped by user`));
                        return;
                    }
                }

                clearTimeout(timeout);
                this.removeMessageHandler<Type>(name, handler);
                resolve(message);
            };

            this.addMessageHandler<Type>(name, handler);
        });
    }

    private sendToOnshape(message: ClientToOnshapeMessage) {
        try {
            window.parent.postMessage({
                ...message,
                documentId: this.docId,
                workspaceId: this.wvmId,
                elementId: this.elementId
            }, this.baseDomain);
        } catch (e) {
            console.warn("postMessage failed:", e);
        }
    }

    public requestSelectionHighlight(selections: RequestSelectionHighlightItem[]) {
        const messageId = crypto.randomUUID();
        this.sendToOnshape({
            messageName: "requestSelectionHighlight",
            messageId,
            selections
        });
    }

    public showMessageBubble(message: string) {
        this.sendToOnshape({
            messageName: "showMessageBubble",
            message
        });
    }

    /**
     * Open another element in the current workspace. This is useful for opening a part studio or
     * assembly from a part.  
     * So Onshape _says_ that this only works with right panel extensions, but it works in tabs too.
     * it's nice for us, at least!
     * @param anotherElementId 
     */
    public openAnotherElementInCurrentWorkspace(anotherElementId: string) {
        this.sendToOnshape({
            messageName: "openAnotherElementInCurrentWorkspace",
            anotherElementId
        });
    }

    private selectingPart: boolean = false;
    /**
     * Request a user selection. This only works in the context of a right-panel extension!
     */
    public async requestSelection(
        message: string, entityTypeSpecifier: RequestSelectionType[],
        requiredSelectionCount: number = 1
    ): Promise<OnshapeSelection[]> {
        if(this.selectingPart) {
            throw new Error("Already selecting a part");
        }
        this.selectingPart = true;

        try {
            const messageId = crypto.randomUUID();
            this.sendToOnshape({
                messageName: "requestSelection",
                messageId,
                entityTypeSpecifier,
                requiredSelectionCount
            });
            this.showMessageBubble(message);

            const response = await this.waitForMessage("REQUESTED_SELECTION", 60_000 * 5);
            return response.selections;
        } finally {
            this.selectingPart = false;
        }
    }

    /**
     * Wait for a user selection. This only works in the context of a right-panel extension!
     */
    public async waitForClientSelection(): Promise<OnshapeSelection[]> {
        if(get(this.selections).length > 0) return get(this.selections);
        const response = await this.waitForMessage("SELECTION", 60_000 * 5);
        return response.selections;
    }

    /**
     * Open the select item dialogue for a selection. This only works in the context of a tab extension!
     */
    public async openSelectItemDialog(options: {
        dialogTitle?: string;
        selectAssemblies?: boolean;
        selectBlobs?: boolean;
        selectBlobMimeTypes?: string;
        selectMultiple?: boolean;
        selectParts?: boolean;
        selectPartStudios?: boolean;
        showBrowseDocuments?: boolean;
        showStandardContent?: boolean;
    }): Promise<ItemSelectedMessage> {
        this.sendToOnshape({
            messageName: "openSelectItemDialog",
            ...options
        });

        const response = await this.waitForMessage("itemSelectedInSelectItemDialog", 60_000 * 5);
        return response;
    }

    async getPartSelection(): Promise<PartSelection | null> {
        if(this.location === "right-panel-part-studio" || this.location === "right-panel-assembly") {
            const selections = await this.requestSelection("Select a part to create a card for.", ["BODY"]);
            return selections && selections.length > 0 ? {
                wvm: this.wvm ?? "w",
                type: "part",
                wvmId: this.wvmId ?? "",
                documentId: this.docId ?? "",
                elementId: this.elementId ?? "",
                partId: selections[0].selectionId,
                configuration: "default"
            } : null;
        } else if(this.location === "tab") {
            const selection = await this.openSelectItemDialog({
                dialogTitle: "Select a part to create a card for.",
                selectParts: true,
                selectAssemblies: true
            });
            if(!selection) return null;
            console.log("Onshape selection:", selection);

            // sanity checks
            if(selection.isSurface) {
                showAlert({
                    severity: "warning",
                    title: "Can't create part",
                    text: "Please select a part, not a surface."
                });
                return null;
            }
            // meshes are okay
            if(selection.isFlattenedBody) {
                showAlert({
                    severity: "warning",
                    title: "Can't create part",
                    text: "Please select a part, not a flattened body."
                });
                return null;
            }
            if(selection.isComposite) {
                // probably fine. uh, maybe
            }
            if((selection.elementType !== "partstudio" || !selection.elementId) && selection.elementType !== "assembly") {
                showAlert({
                    severity: "warning",
                    title: "Can't create part",
                    text: "Please select a part from a part studio or assembly."
                });
                return null;
            }
            if(selection.itemType !== "part" && selection.itemType !== "assembly") {
                showAlert({
                    severity: "warning",
                    title: "Can't create part",
                    text: "Please select a part or assembly, not a part studio."
                });
                return null;
            }

            let documentId = selection.documentId;
            if(!documentId) {
                showAlert({
                    severity: "warning",
                    title: "Can't create part",
                    text: "No document found for selected part."
                });
                return null;
            }

            let elementId = selection.elementId;
            if(!elementId) {
                showAlert({
                    severity: "warning",
                    title: "Can't create part",
                    text: "No part studio or assembly found for selected item."
                });
                return null;
            }

            let partId = selection.idTag;
            if(selection.itemType === "part" && !partId) {
                showAlert({
                    severity: "warning",
                    title: "Can't create part",
                    text: "No part found for selected item."
                });
                return null;
            }

            let workspaceId = selection.workspaceId;
            let versionId = selection.versionId;
            if(!workspaceId && !versionId) {
                showAlert({
                    severity: "warning",
                    title: "Can't create part",
                    text: "No workspace or version found for selected part."
                });
                return null;
            }

            let wvm: "w" | "v" | "m" = "w";
            let wvmId = workspaceId || versionId;
            if(wvmId === versionId) wvm = "v";

            return {
                type: selection.elementType === "partstudio" ? "part" : "assembly",
                wvm,
                wvmId,
                documentId,
                elementId,
                partId,
                configuration: selection.elementConfiguration || "default"
            };
        }
        return null;
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
                    this.selections.set(data.selections);
                    break;
                default:
                    console.info("Received unhandled message from Onshape:", data);
                    break;
            }
            if(this.messageHandlers[data.messageName]) {
                for(const handler of this.messageHandlers[data.messageName]) {
                    handler(data);
                }
            }
        } else {
            console.warn("Received message with unexpected format:", event.data);
        }
    }
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
/**
 * Generate a random record ID like pocketbase's internal IDs. Pocketbase may check if
 * the ID doesn't already exist but we'd need to generate 66 billion random IDs for a 1%
 * chance of collision, so... it's fine
 */
export function generateRecordID(length = 15) {
    const resultChars: string[] = [];
    const n = ALPHABET.length;
    const maxMultiple = Math.floor(256 / n) * n; // largest multiple of n less than 256

    const bytes = new Uint8Array(1);
    while(resultChars.length < length) {
        crypto.getRandomValues(bytes);
        const v = bytes[0];
        if(v >= maxMultiple) continue; // avoid modulo bias
        resultChars.push(ALPHABET[v % n]);
    }

    return resultChars.join("");
}