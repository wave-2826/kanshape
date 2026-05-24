/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1397839223")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n    g.id, g.name, g.description, g.created, g.updated,\n    (\n        SELECT COUNT(*)\n        FROM users u, json_each(u.groups) j\n        WHERE j.value = g.id\n    ) AS member_count,\n\t(\n    SELECT COUNT(*)\n    \tFROM cards c,\n        \tjson_each(json_extract(c.assignment_data, '$.ids')) j\n    \tWHERE json_extract(c.assignment_data, '$.type') = 'groups'\n      \tAND j.value = g.id\n\t) AS card_count\nFROM groups g"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_M6M1")

  // remove field
  collection.fields.removeById("_clone_llfw")

  // remove field
  collection.fields.removeById("_clone_hKv1")

  // remove field
  collection.fields.removeById("_clone_B8D4")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_zhQF",
    "max": 0,
    "min": 0,
    "name": "name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_aW4f",
    "max": 0,
    "min": 0,
    "name": "description",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "_clone_RUjA",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "_clone_RdqT",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1397839223")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n    g.id, g.name, g.description, g.created, g.updated,\n    (\n        SELECT COUNT(*)\n        FROM users u, json_each(u.groups) j\n        WHERE j.value = g.id\n    ) AS member_count,\n\t(\n\t\tSELECT COUNT(*)\n\t\tFROM cards c, json_each(c.group_assignment_cache) j\n\t\tWHERE j.value = c.id\n\t) AS card_count\nFROM groups g"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_M6M1",
    "max": 0,
    "min": 0,
    "name": "name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_llfw",
    "max": 0,
    "min": 0,
    "name": "description",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "_clone_hKv1",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "_clone_B8D4",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // remove field
  collection.fields.removeById("_clone_zhQF")

  // remove field
  collection.fields.removeById("_clone_aW4f")

  // remove field
  collection.fields.removeById("_clone_RUjA")

  // remove field
  collection.fields.removeById("_clone_RdqT")

  return app.save(collection)
})
