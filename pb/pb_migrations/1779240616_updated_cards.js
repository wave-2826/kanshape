/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // add field
  collection.fields.addAt(12, new Field({
    "hidden": false,
    "id": "json3776865320",
    "maxSize": 0,
    "name": "due_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // remove field
  collection.fields.removeById("json3776865320")

  return app.save(collection)
})
