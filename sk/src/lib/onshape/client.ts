import { writable, type Writable } from "svelte/store";
import type { AppConfig } from "../config";
import createClient from "openapi-fetch";
import { ONSHAPE_CUSTOM_BODY_SYMBOL, onshapeApiFetch } from "./requests";
import type { paths } from "./schema";

type OnshapeSelectionType = "BODY" | "ENTITY" | "FEATURE";
type OnshapeEntityType = "EDGE" | "FACE" | "VERTEX" | "DEGENERATE_EDGE" | "UNKNOWN";

type OnshapeSelection = {
    selectionId: string;
    selectionType: OnshapeSelectionType;
    entityType?: OnshapeEntityType;
    occurrencePath?: string;
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

export class OnshapeClient {
    private boundHandleMessage: (event: MessageEvent) => void;
    private baseDomain: string;
    private keepAliveInterval: number | null = null;

    /** The transient entity IDs selected. */
    public selectedIDs: Writable<string[]> = writable([]);

    public requests;

    private messageHandlers: { [message: string]: Set<(message: OnshapeToClientMessage) => void> } = {};

    constructor(private config: AppConfig, private docId: string, private wvmId: string, private elementId: string) {
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

                    this.selectedIDs.set(selectedIds);
                    break;
                default:
                    if(this.messageHandlers[data.messageName]) {
                        for(const handler of this.messageHandlers[data.messageName]) {
                            handler(data);
                        }
                        break;
                    }
                    console.info("Received unhandled message from Onshape:", data);
                    break;
            }
        } else {
            console.warn("Received message with unexpected format:", event.data);
        }
    }
}