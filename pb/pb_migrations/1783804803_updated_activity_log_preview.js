/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3759735719")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\te.id,\n\te.actor,\n\tactor.name AS actor_name,\n\tp.title AS project_title,\n\tp.color AS project_color,\n\te.action,\n\te.entity_type,\n\te.entity_id,\n\te.entity_title,\n\te.changes,\n\te.date\nFROM activity_log AS e\nLEFT JOIN users AS actor ON actor.id = e.actor\nLEFT JOIN projects AS p ON p.id = e.project_id"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_9fn4")

  // remove field
  collection.fields.removeById("_clone_T0QX")

  // remove field
  collection.fields.removeById("_clone_Oky7")

  // remove field
  collection.fields.removeById("_clone_1JHh")

  // remove field
  collection.fields.removeById("_clone_Ggy0")

  // remove field
  collection.fields.removeById("_clone_SKBf")

  // remove field
  collection.fields.removeById("_clone_dY4t")

  // remove field
  collection.fields.removeById("_clone_6lih")

  // remove field
  collection.fields.removeById("_clone_2Zfm")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "The user who made the change",
    "hidden": false,
    "id": "_clone_phOS",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "actor",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_wMPy",
    "max": 255,
    "min": 0,
    "name": "actor_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_Ox4h",
    "max": 0,
    "min": 0,
    "name": "project_title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_Bayy",
    "max": 0,
    "min": 0,
    "name": "project_color",
    "pattern": "^#[A-Fa-f0-9]{6}$",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_hlJb",
    "maxSelect": 0,
    "name": "action",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "create",
      "update",
      "delete"
    ]
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_sk2Y",
    "maxSelect": 0,
    "name": "entity_type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "project",
      "board",
      "section",
      "card",
      "subproject"
    ]
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "Not a relation since we have to link to a bunch of different tables",
    "hidden": false,
    "id": "_clone_LW9J",
    "max": 0,
    "min": 0,
    "name": "entity_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "help": "Cached to survive deleted records and stuff",
    "hidden": false,
    "id": "_clone_mGX2",
    "max": 0,
    "min": 0,
    "name": "entity_title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "help": "Change data for this entity",
    "hidden": false,
    "id": "_clone_4SGN",
    "maxSize": 0,
    "name": "changes",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "_clone_YvP2",
    "name": "date",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3759735719")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\te.id,\n\te.actor,\n\tactor.name AS actor_name,\n\tp.title AS project_title,\n\te.action,\n\te.entity_type,\n\te.entity_id,\n\te.entity_title,\n\te.changes,\n\te.date\nFROM activity_log AS e\nLEFT JOIN users AS actor ON actor.id = e.actor\nLEFT JOIN projects AS p ON p.id = e.project_id"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "The user who made the change",
    "hidden": false,
    "id": "_clone_9fn4",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "actor",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_T0QX",
    "max": 255,
    "min": 0,
    "name": "actor_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_Oky7",
    "max": 0,
    "min": 0,
    "name": "project_title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_1JHh",
    "maxSelect": 0,
    "name": "action",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "create",
      "update",
      "delete"
    ]
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_Ggy0",
    "maxSelect": 0,
    "name": "entity_type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "project",
      "board",
      "section",
      "card",
      "subproject"
    ]
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "help": "Not a relation since we have to link to a bunch of different tables",
    "hidden": false,
    "id": "_clone_SKBf",
    "max": 0,
    "min": 0,
    "name": "entity_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "Cached to survive deleted records and stuff",
    "hidden": false,
    "id": "_clone_dY4t",
    "max": 0,
    "min": 0,
    "name": "entity_title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "help": "Change data for this entity",
    "hidden": false,
    "id": "_clone_6lih",
    "maxSize": 0,
    "name": "changes",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "_clone_2Zfm",
    "name": "date",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // remove field
  collection.fields.removeById("_clone_phOS")

  // remove field
  collection.fields.removeById("_clone_wMPy")

  // remove field
  collection.fields.removeById("_clone_Ox4h")

  // remove field
  collection.fields.removeById("_clone_Bayy")

  // remove field
  collection.fields.removeById("_clone_hlJb")

  // remove field
  collection.fields.removeById("_clone_sk2Y")

  // remove field
  collection.fields.removeById("_clone_LW9J")

  // remove field
  collection.fields.removeById("_clone_mGX2")

  // remove field
  collection.fields.removeById("_clone_4SGN")

  // remove field
  collection.fields.removeById("_clone_YvP2")

  return app.save(collection)
})
