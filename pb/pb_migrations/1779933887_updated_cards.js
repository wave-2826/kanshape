/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // add field
  collection.fields.addAt(9, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3304927325",
    "help": "",
    "hidden": false,
    "id": "relation1482042183",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "board",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // remove field
  collection.fields.removeById("relation1482042183")

  return app.save(collection)
})
