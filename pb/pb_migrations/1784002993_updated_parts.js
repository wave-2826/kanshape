/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "help": "Onshape ID of the workspace, version, or microversion referenced.",
    "hidden": false,
    "id": "text3907993084",
    "max": 0,
    "min": 0,
    "name": "wvm_id",
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
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "help": "Onshape ID of the workspace, version, or microversion referenced.",
    "hidden": false,
    "id": "text3907993084",
    "max": 0,
    "min": 0,
    "name": "wvmId",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
