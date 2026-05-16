/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2817666393")

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number3205513493",
    "max": null,
    "min": null,
    "name": "part_id_offset",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2817666393")

  // remove field
  collection.fields.removeById("number3205513493")

  return app.save(collection)
})
