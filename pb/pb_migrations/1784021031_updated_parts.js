/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3275716663",
    "max": 0,
    "min": 0,
    "name": "document_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "The element ID of the part studio this part was defined in",
    "hidden": false,
    "id": "text522136100",
    "max": 0,
    "min": 0,
    "name": "element_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
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
    "required": true,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(9, new Field({
    "help": "Whether this references a workspace (w), version (v), or microversion (m).",
    "hidden": false,
    "id": "select3835257938",
    "maxSelect": 0,
    "name": "wvm",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "w",
      "v",
      "m"
    ]
  }))

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
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3275716663",
    "max": 0,
    "min": 0,
    "name": "document_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "The element ID of the part studio this part was defined in",
    "hidden": false,
    "id": "text522136100",
    "max": 0,
    "min": 0,
    "name": "element_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
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

  // update field
  collection.fields.addAt(9, new Field({
    "help": "Whether this references a workspace (w), version (v), or microversion (m).",
    "hidden": false,
    "id": "select3835257938",
    "maxSelect": 0,
    "name": "wvm",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "w",
      "v",
      "m"
    ]
  }))

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
})
