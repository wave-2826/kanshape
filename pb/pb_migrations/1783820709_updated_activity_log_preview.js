/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3759735719")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\te.id,\n\te.actor,\n\tactor.name AS actor_name,\n\te.project_id,\n\tp.title AS project_title,\n\tp.color AS project_color,\n\te.action,\n\te.entity_type,\n\te.entity_id,\n\te.entity_title,\n\te.changes,\n\te.date\nFROM activity_log AS e\nLEFT JOIN users AS actor ON actor.id = e.actor\nLEFT JOIN projects AS p ON p.id = e.project_id"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_eA1H")

  // remove field
  collection.fields.removeById("_clone_r7rQ")

  // remove field
  collection.fields.removeById("_clone_0gYB")

  // remove field
  collection.fields.removeById("_clone_TcZ5")

  // remove field
  collection.fields.removeById("_clone_pqju")

  // remove field
  collection.fields.removeById("_clone_kV7k")

  // remove field
  collection.fields.removeById("_clone_a2Ik")

  // remove field
  collection.fields.removeById("_clone_qWii")

  // remove field
  collection.fields.removeById("_clone_G8q6")

  // remove field
  collection.fields.removeById("_clone_xWmd")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "The user who made the change",
    "hidden": false,
    "id": "_clone_gwPZ",
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
    "id": "_clone_GnTI",
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
    "cascadeDelete": false,
    "collectionId": "pbc_484305853",
    "help": "Optionally, what project this happened in",
    "hidden": false,
    "id": "_clone_mZ0C",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "project_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_K5TK",
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
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_oDUk",
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
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_ksbg",
    "maxSelect": 0,
    "name": "action",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "create",
      "update",
      "delete"
    ]
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_SbIP",
    "maxSelect": 0,
    "name": "entity_type",
    "presentable": false,
    "required": true,
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
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "help": "Not a relation since we have to link to a bunch of different tables",
    "hidden": false,
    "id": "_clone_wVS1",
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
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "help": "Cached to survive deleted records and stuff",
    "hidden": false,
    "id": "_clone_tOIh",
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
  collection.fields.addAt(10, new Field({
    "help": "Change data for this entity",
    "hidden": false,
    "id": "_clone_ihFu",
    "maxSize": 0,
    "name": "changes",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "_clone_jpCa",
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
    "viewQuery": "SELECT\n\te.id,\n\te.actor,\n\tactor.name AS actor_name,\n\tp.title AS project_title,\n\tp.color AS project_color,\n\te.action,\n\te.entity_type,\n\te.entity_id,\n\te.entity_title,\n\te.changes,\n\te.date\nFROM activity_log AS e\nLEFT JOIN users AS actor ON actor.id = e.actor\nLEFT JOIN projects AS p ON p.id = e.project_id"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "The user who made the change",
    "hidden": false,
    "id": "_clone_eA1H",
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
    "id": "_clone_r7rQ",
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
    "id": "_clone_0gYB",
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
    "id": "_clone_TcZ5",
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
    "id": "_clone_pqju",
    "maxSelect": 0,
    "name": "action",
    "presentable": false,
    "required": true,
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
    "id": "_clone_kV7k",
    "maxSelect": 0,
    "name": "entity_type",
    "presentable": false,
    "required": true,
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
    "id": "_clone_a2Ik",
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
    "id": "_clone_qWii",
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
    "id": "_clone_G8q6",
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
    "id": "_clone_xWmd",
    "name": "date",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // remove field
  collection.fields.removeById("_clone_gwPZ")

  // remove field
  collection.fields.removeById("_clone_GnTI")

  // remove field
  collection.fields.removeById("_clone_mZ0C")

  // remove field
  collection.fields.removeById("_clone_K5TK")

  // remove field
  collection.fields.removeById("_clone_oDUk")

  // remove field
  collection.fields.removeById("_clone_ksbg")

  // remove field
  collection.fields.removeById("_clone_SbIP")

  // remove field
  collection.fields.removeById("_clone_wVS1")

  // remove field
  collection.fields.removeById("_clone_tOIh")

  // remove field
  collection.fields.removeById("_clone_ihFu")

  // remove field
  collection.fields.removeById("_clone_jpCa")

  return app.save(collection)
})
