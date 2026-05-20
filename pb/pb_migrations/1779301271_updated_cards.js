/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // remove field
  collection.fields.removeById("json3776865320")

  // add field
  collection.fields.addAt(12, new Field({
    "hidden": false,
    "id": "date111095121",
    "max": "",
    "min": "",
    "name": "due_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "json4143267583",
    "maxSize": 0,
    "name": "assignment_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // update field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "json2918445923",
    "maxSize": 0,
    "name": "metadata",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // add field
  collection.fields.addAt(12, new Field({
    "hidden": false,
    "id": "json3776865320",
    "maxSize": 0,
    "name": "due_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // remove field
  collection.fields.removeById("date111095121")

  // remove field
  collection.fields.removeById("json4143267583")

  // update field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "json2918445923",
    "maxSize": 0,
    "name": "data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
