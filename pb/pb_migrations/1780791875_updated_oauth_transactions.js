/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4199449046")

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "help": "Since we trust the client's forwarded host, we need to store this per-request",
    "hidden": false,
    "id": "text3876702488",
    "max": 0,
    "min": 0,
    "name": "redirect_uri",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4199449046")

  // remove field
  collection.fields.removeById("text3876702488")

  return app.save(collection)
})
