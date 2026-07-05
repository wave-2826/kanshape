/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // add field
  collection.fields.addAt(11, new Field({
    "help": "Files stored in the metadata, referenced by their filename as an ID. Could probably be a separate table with a relation, but I think this will work fine for now.",
    "hidden": false,
    "id": "file104153177",
    "maxSelect": 10,
    "maxSize": 100000000,
    "mimeTypes": null,
    "name": "files",
    "presentable": false,
    "protected": true,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // remove field
  collection.fields.removeById("file104153177")

  return app.save(collection)
})
