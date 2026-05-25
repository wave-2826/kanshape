/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2317931559")

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "Title of the Onshape document, from the API. Cached, so might be out of date.",
    "hidden": false,
    "id": "text724990059",
    "max": 0,
    "min": 0,
    "name": "title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2317931559")

  // remove field
  collection.fields.removeById("text724990059")

  return app.save(collection)
})
