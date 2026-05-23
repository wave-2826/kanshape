/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_rBZoQpsgyr` ON `cards` (`user_assignment_cache`)",
      "CREATE INDEX `idx_DwEhXkgiCQ` ON `cards` (`group_assignment_cache`)"
    ]
  }, collection)

  // add field
  collection.fields.addAt(14, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3346940990",
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

  // update field
  collection.fields.addAt(13, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  // remove field
  collection.fields.removeById("relation1192512424")

  // update field
  collection.fields.addAt(9, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation814371037",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "user_assignments",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
