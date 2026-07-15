/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "select2363381545",
    "maxSelect": 0,
    "name": "type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "part",
      "assembly"
    ]
  }))

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
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // remove field
  collection.fields.removeById("select2363381545")

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
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
