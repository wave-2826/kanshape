/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2317931559")

  // update field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2817666393",
    "help": "",
    "hidden": false,
    "id": "relation1459818029",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "subproject",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2317931559")

  // update field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2817666393",
    "help": "",
    "hidden": false,
    "id": "relation1459818029",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "subprojects",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
