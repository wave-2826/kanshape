// Extending PocketBase with JS - @see https://pocketbase.io/docs/js-overview/

/// <reference path="../pb_data/types.d.ts" />

for(const file of $os.readDir(`${__hooks}/onshape`)) {
    if(file.name().endsWith(".pb.js")) {
        require(`${__hooks}/onshape/${file.name()}`);
    }
}