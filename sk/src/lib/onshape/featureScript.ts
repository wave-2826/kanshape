import { onshapeClient } from "./requests";
import type { components } from "./schema";

type EvalResponse = components["schemas"]["BTFeatureScriptEvalResponse-1859"];

type FeatureScriptValue = (
    ({ btType: "com.belmonttech.serialize.fsvalue.BTFSValueArray" } & Omit<components["schemas"]["BTFSValueArray-1499"], "btType">) |
    ({ btType: "com.belmonttech.serialize.fsvalue.BTFSValueMap" } & Omit<components["schemas"]["BTFSValueMap-2062"], "btType">) |
    ({ btType: "com.belmonttech.serialize.fsvalue.BTFSValueBoolean" } & Omit<components["schemas"]["BTFSValueBoolean-1195"], "btType">) |
    ({ btType: "com.belmonttech.serialize.fsvalue.BTFSValueNumber" } & Omit<components["schemas"]["BTFSValueNumber-772"], "btType">) |
    ({ btType: "com.belmonttech.serialize.fsvalue.BTFSValueString" } & Omit<components["schemas"]["BTFSValueString-1422"], "btType">) |
    ({ btType: "com.belmonttech.serialize.fsvalue.BTFSValueUndefined" } & Omit<components["schemas"]["BTFSValueUndefined-2003"], "btType">) |
    ({ btType: "com.belmonttech.serialize.fsvalue.BTFSValueWithUnits" } & Omit<components["schemas"]["BTFSValueWithUnits-1817"], "btType">) |
    ({ btType: "com.belmonttech.serialize.fsvalue.BTFSValueTooBig" } & Omit<components["schemas"]["BTFSValueTooBig-1247"], "btType">) |
    ({ btType: "com.belmonttech.serialize.fsvalue.BTFSValueOther" } & Omit<components["schemas"]["BTFSValueOther-1124"], "btType">)
);

function parseFSValue(value: FeatureScriptValue): any {
    switch(value.btType) {
        case "com.belmonttech.serialize.fsvalue.BTFSValueMap": {
            const map = {} as Record<string, any>;
            for(const entry of value.value ?? []) {
                if(entry.key?.btType !== "com.belmonttech.serialize.fsvalue.BTFSValueString") {
                    console.error("Unexpected map key type", entry.key);
                    continue;
                }
                const key = (entry.key as components["schemas"]["BTFSValueString-1422"]).value;
                if(!key) continue;

                map[key] = parseFSValue(entry.value as FeatureScriptValue);
            }
            return map;
        }
        case "com.belmonttech.serialize.fsvalue.BTFSValueArray":
            return (value.value as FeatureScriptValue[])?.map(parseFSValue);
        case "com.belmonttech.serialize.fsvalue.BTFSValueBoolean":
        case "com.belmonttech.serialize.fsvalue.BTFSValueNumber":
        case "com.belmonttech.serialize.fsvalue.BTFSValueString":
            return value.value ?? undefined;
        case "com.belmonttech.serialize.fsvalue.BTFSValueUndefined":
        case "com.belmonttech.serialize.fsvalue.BTFSValueTooBig":
        case "com.belmonttech.serialize.fsvalue.BTFSValueOther":
            return value.btType; // for now, whatever
    }
}

export async function evalFeatureScript<T = any>(
    did: string,
    wvm: "w" | "v" | "m",
    wvmid: string,
    eid: string,
    script: string
): Promise<T | null> {
    // Not sure why this typing doesn't work; oh well
    const { data: data_ } = await onshapeClient.POST(
        "/partstudios/d/{did}/{wvm}/{wvmid}/e/{eid}/featurescript",
        {
            params: {
                path: {
                    did, wvm, wvmid, eid
                },
                query: {
                    rollbackBarIndex: -1
                }
            },
            body: { libraryVersion: 2960, script },
            headers: {
                'Content-Type': 'application/json;charset=UTF-8; qs=0.09',
                'Accept': 'application/json;charset=UTF-8; qs=0.09'
            }
        }
    );

    if(data_) {
        let data = data_ as components["schemas"]["BTFeatureScriptEvalResponse-1859"];
        return parseFSValue(data.result as FeatureScriptValue) as T;
    }

    return null;
}