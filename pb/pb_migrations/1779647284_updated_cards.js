/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  // remove field
  collection.fields.removeById("relation814371037")

  // remove field
  collection.fields.removeById("relation1192512424")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_rBZoQpsgyr` ON `cards` (`user_assignment_cache`)",
      "CREATE INDEX `idx_DwEhXkgiCQ` ON `cards` (`group_assignment_cache`)"
    ]
  }, collection)

  // add field
  collection.fields.addAt(13, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "relation814371037",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "user_assignment_cache",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3346940990",
    "help": "",
    "hidden": false,
    "id": "relation1192512424",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "group_assignment_cache",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
