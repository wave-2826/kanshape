/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3275716663",
        "max": 0,
        "min": 0,
        "name": "document_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "The element ID of the part studio this part was defined in",
        "hidden": false,
        "id": "text522136100",
        "max": 0,
        "min": 0,
        "name": "element_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "Onshape internal part ID",
        "hidden": false,
        "id": "text1289964524",
        "max": 0,
        "min": 0,
        "name": "part_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_3481593366",
        "help": "",
        "hidden": false,
        "id": "relation370448595",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "card",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "Result of running our part heuristic featurescript on the part to predict its type, dimensions, etc",
        "hidden": false,
        "id": "json436374599",
        "maxSize": 0,
        "name": "part_heuristic_result",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "file3277268710",
        "maxSelect": 0,
        "maxSize": 0,
        "mimeTypes": null,
        "name": "thumbnail",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_2718308629",
    "indexes": [
      "CREATE INDEX `idx_esjy6p5766` ON `parts` (\n  `document_id`,\n  `element_id`\n)"
    ],
    "listRule": "",
    "name": "parts",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629");

  return app.delete(collection);
})
