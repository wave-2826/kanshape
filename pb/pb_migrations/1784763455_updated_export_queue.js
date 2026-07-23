/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("export_queue");

  // Add status field
  collection.fields.addAt(6, new TextField({
    "name": "status",
    "required": true,
    "max": 0,
    "min": 0,
    "pattern": "",
    "autogeneratePattern": "",
    "help": "Status: queued, translating, completed, failed"
  }));

  // Add translation_id field
  collection.fields.addAt(7, new TextField({
    "name": "translation_id",
    "required": false,
    "max": 0,
    "min": 0,
    "pattern": "",
    "autogeneratePattern": "",
    "help": "Onshape translation ID for this export"
  }));

  // Add error_message field
  collection.fields.addAt(8, new TextField({
    "name": "error_message",
    "required": false,
    "max": 0,
    "min": 0,
    "pattern": "",
    "autogeneratePattern": "",
    "help": "Error message if the export failed"
  }));

  // Add created_by relation to users
  collection.fields.addAt(9, new RelationField({
    "name": "created_by",
    "collectionId": app.findCollectionByNameOrId("users").id,
    "cascadeDelete": false,
    "minSelect": 0,
    "maxSelect": 1,
    "required": false
  }));

  // Add webhook_id field to track the registered webhook
  collection.fields.addAt(10, new TextField({
    "name": "webhook_id",
    "required": false,
    "max": 0,
    "min": 0,
    "pattern": "",
    "autogeneratePattern": "",
    "help": "Onshape webhook ID registered for this translation"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("export_queue");

  // Remove fields in reverse order
  collection.fields.remove(collection.fields.get("webhook_id").id);
  collection.fields.remove(collection.fields.get("created_by").id);
  collection.fields.remove(collection.fields.get("error_message").id);
  collection.fields.remove(collection.fields.get("translation_id").id);
  collection.fields.remove(collection.fields.get("status").id);

  return app.save(collection);
});