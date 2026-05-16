/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2817666393")

  // remove field
  collection.fields.removeById("relation800313582")

  // remove field
  collection.fields.removeById("number3205513493")

  // remove field
  collection.fields.removeById("number1873179230")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2817666393")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_484305853",
    "hidden": false,
    "id": "relation800313582",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "project",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number3205513493",
    "max": null,
    "min": null,
    "name": "part_id_offset",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number1873179230",
    "max": null,
    "min": 1,
    "name": "major_revision",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
