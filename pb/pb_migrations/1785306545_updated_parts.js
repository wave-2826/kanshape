/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3481593366",
    "help": "",
    "hidden": false,
    "id": "relation370448595",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "current_card",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3481593366",
    "help": "",
    "hidden": false,
    "id": "relation370448595",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "current_card",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
