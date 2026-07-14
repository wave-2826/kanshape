/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_esjy6p5766` ON `parts` (\n  `document_id`,\n  `element_id`\n)",
      "CREATE INDEX `idx_rmv4zpf6h6` ON `parts` (`current_card`)"
    ]
  }, collection)

  // add field
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

  // add field
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
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_esjy6p5766` ON `parts` (\n  `document_id`,\n  `element_id`\n)"
    ]
  }, collection)

  // remove field
  collection.fields.removeById("select3835257938")

  // remove field
  collection.fields.removeById("text3907993084")

  return app.save(collection)
})
