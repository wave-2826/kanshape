/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1397839223")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n    g.id, g.name, g.description, g.created, g.updated,\n    (\n        SELECT COUNT(*)\n        FROM users u, json_each(u.groups) j\n        WHERE j.value = g.id\n    ) AS member_count,\n\t(\n\t\tSELECT COUNT(*)\n\t\tFROM cards c, json_each(c.group_assignment_cache) j\n\t\tWHERE j.value = c.id\n\t) AS card_count\nFROM groups g"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_Hvu9")

  // remove field
  collection.fields.removeById("_clone_LAYH")

  // remove field
  collection.fields.removeById("_clone_nhnE")

  // remove field
  collection.fields.removeById("_clone_28yy")

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

  // add field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "json3186472356",
    "maxSize": 1,
    "name": "card_count",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1397839223")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n    g.id, g.name, g.description, g.created, g.updated,\n    (\n        SELECT COUNT(*)\n        FROM users u, json_each(u.groups) j\n        WHERE j.value = g.id\n    ) AS member_count\nFROM groups g"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_Hvu9",
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
    "id": "_clone_LAYH",
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
    "id": "_clone_nhnE",
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
    "id": "_clone_28yy",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // remove field
  collection.fields.removeById("_clone_M6M1")

  // remove field
  collection.fields.removeById("_clone_llfw")

  // remove field
  collection.fields.removeById("_clone_hKv1")

  // remove field
  collection.fields.removeById("_clone_B8D4")

  // remove field
  collection.fields.removeById("json3186472356")

  return app.save(collection)
})
