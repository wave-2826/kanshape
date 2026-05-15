/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2817666393")

  // add field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1809324929",
    "hidden": false,
    "id": "relation22982150",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "visible_sections",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2817666393")

  // remove field
  collection.fields.removeById("relation22982150")

  return app.save(collection)
})
