/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2862527041")

  // update field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "select1204587666",
    "maxSelect": 0,
    "name": "action",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "create",
      "update",
      "delete"
    ]
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select3289574914",
    "maxSelect": 0,
    "name": "entity_type",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "project",
      "board",
      "section",
      "card",
      "subproject"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2862527041")

  // update field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "select1204587666",
    "maxSelect": 0,
    "name": "action",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "create",
      "update",
      "delete"
    ]
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select3289574914",
    "maxSelect": 0,
    "name": "entity_type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "project",
      "board",
      "section",
      "card",
      "subproject"
    ]
  }))

  return app.save(collection)
})
