/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "help": "The Onshape configuration string of the part or assembly",
    "hidden": false,
    "id": "text2783094231",
    "max": 0,
    "min": 0,
    "name": "configuration",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // remove field
  collection.fields.removeById("text2783094231")

  return app.save(collection)
})
