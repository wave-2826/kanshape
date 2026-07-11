/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_950263630")

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3481593366",
    "help": "",
    "hidden": false,
    "id": "relation370448595",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "card",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_950263630")

  // update field
  collection.fields.addAt(1, new Field({
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
  }))

  return app.save(collection)
})
