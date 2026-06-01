/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3304927325")

  // add field
  collection.fields.addAt(4, new Field({
    "help": "Used only for parts boards",
    "hidden": false,
    "id": "number3874410089",
    "max": null,
    "min": null,
    "name": "current_part_id",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "Used only for parts boards",
    "hidden": false,
    "id": "text1974144331",
    "max": 0,
    "min": 0,
    "name": "part_id_prefix",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3304927325")

  // remove field
  collection.fields.removeById("number3874410089")

  // remove field
  collection.fields.removeById("text1974144331")

  return app.save(collection)
})
