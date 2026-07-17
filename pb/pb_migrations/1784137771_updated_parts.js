/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "Onshape internal part ID. Unset for assemblies.",
    "hidden": false,
    "id": "text1289964524",
    "max": 0,
    "min": 0,
    "name": "part_id",
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

  // update field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "Onshape internal part ID",
    "hidden": false,
    "id": "text1289964524",
    "max": 0,
    "min": 0,
    "name": "part_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
