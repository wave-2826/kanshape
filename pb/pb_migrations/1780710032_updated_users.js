/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add field
  collection.fields.addAt(12, new Field({
    "help": "Contains OAuth data for Onshape. Only used on the backend.",
    "hidden": true,
    "id": "json1132647495",
    "maxSize": 0,
    "name": "onshape_oauth",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove field
  collection.fields.removeById("json1132647495")

  return app.save(collection)
})
