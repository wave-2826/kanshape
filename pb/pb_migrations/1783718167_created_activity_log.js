/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
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
        "id": "relation1148540665",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "actor",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select1204587666",
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
        "id": "select3289574914",
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
        "id": "text2166717789",
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
        "id": "text2277658002",
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
        "id": "relation376250268",
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
        "id": "json539015229",
        "maxSize": 0,
        "name": "changes",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "autodate2862495610",
        "name": "date",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_2862527041",
    "indexes": [],
    "listRule": null,
    "name": "activity_log",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2862527041");

  return app.delete(collection);
})
