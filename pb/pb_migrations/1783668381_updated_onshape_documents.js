/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2317931559")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "we always use wvm=w (for workspace), so this stores the workspace ID",
    "hidden": false,
    "id": "text2194934303",
    "max": 0,
    "min": 0,
    "name": "workspace_id",
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
  collection.fields.removeById("text2194934303")

  return app.save(collection)
})
