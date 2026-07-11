/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 0,
        "min": 0,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
        "help": "Change data for this entity",
        "hidden": false,
        "id": "_clone_YMqr",
        "maxSize": 0,
        "name": "changes",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "_clone_Pmw4",
        "name": "date",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3759735719",
    "indexes": [],
    "listRule": "@request.auth.id != \"\"",
    "name": "activity_log_preview",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT\n\te.id,\n\te.actor,\n\tactor.name AS actor_name,\n\te.action,\n\te.entity_type,\n\te.entity_id,\n\te.entity_title,\n\te.project_id,\n\te.changes,\n\te.date\nFROM activity_log AS e\nLEFT JOIN users AS actor WHERE actor.id = e.actor",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3759735719");

  return app.delete(collection);
})
