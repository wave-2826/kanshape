/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1809324929")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "bool1023422721",
    "name": "is_completed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1809324929")

  // remove field
  collection.fields.removeById("bool1023422721")

  return app.save(collection)
})
