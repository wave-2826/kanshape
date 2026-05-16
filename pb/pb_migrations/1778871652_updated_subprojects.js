/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2817666393")

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
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2817666393")

  // remove field
  collection.fields.removeById("number1873179230")

  return app.save(collection)
})
