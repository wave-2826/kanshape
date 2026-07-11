/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3759735719")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\te.id,\n\te.actor,\n\tactor.name AS actor_name,\n\tp.title AS project_title,\n\te.action,\n\te.entity_type,\n\te.entity_id,\n\te.entity_title,\n\te.changes,\n\te.date\nFROM activity_log AS e\nLEFT JOIN users AS actor ON actor.id = e.actor\nLEFT JOIN projects AS p ON p.id = e.project_id"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_zVgC")

  // remove field
  collection.fields.removeById("_clone_8lC8")

  // remove field
  collection.fields.removeById("_clone_gFrS")

  // remove field
  collection.fields.removeById("_clone_3vuZ")

  // remove field
  collection.fields.removeById("_clone_me56")

  // remove field
  collection.fields.removeById("_clone_fWtz")

  // remove field
  collection.fields.removeById("_clone_fqXg")

  // remove field
  collection.fields.removeById("_clone_YMqr")

  // remove field
  collection.fields.removeById("_clone_Pmw4")

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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3759735719")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\te.id,\n\te.actor,\n\tactor.name AS actor_name,\n\te.action,\n\te.entity_type,\n\te.entity_id,\n\te.entity_title,\n\te.project_id,\n\te.changes,\n\te.date\nFROM activity_log AS e\nLEFT JOIN users AS actor WHERE actor.id = e.actor"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "The user who made the change",
    "hidden": false,
    "id": "_clone_zVgC",
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
    "id": "_clone_8lC8",
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
    "help": "",
    "hidden": false,
    "id": "_clone_gFrS",
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
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_3vuZ",
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
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "Not a relation since we have to link to a bunch of different tables",
    "hidden": false,
    "id": "_clone_me56",
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
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "help": "Cached to survive deleted records and stuff",
    "hidden": false,
    "id": "_clone_fWtz",
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
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_484305853",
    "help": "Optionally, what project this happened in",
    "hidden": false,
    "id": "_clone_fqXg",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "project_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "help": "Change data for this entity",
    "hidden": false,
    "id": "_clone_YMqr",
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
    "id": "_clone_Pmw4",
    "name": "date",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

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

  return app.save(collection)
})
