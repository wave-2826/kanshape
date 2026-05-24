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
        "help": "",
        "hidden": false,
        "id": "json724990059",
        "maxSize": 1,
        "name": "title",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json1843675174",
        "maxSize": 1,
        "name": "description",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json1177347317",
        "maxSize": 1,
        "name": "position",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json665954036",
        "maxSize": 1,
        "name": "moved_at",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json3725765462",
        "maxSize": 1,
        "name": "created_by",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json762542831",
        "maxSize": 1,
        "name": "section",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json1691449377",
        "maxSize": 1,
        "name": "subproject",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json800313582",
        "maxSize": 1,
        "name": "project",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json1655102503",
        "maxSize": 1,
        "name": "priority",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json111095121",
        "maxSize": 1,
        "name": "due_by",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json4143267583",
        "maxSize": 1,
        "name": "assignment_data",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json2982305149",
        "maxSize": 1,
        "name": "assignment_name_cache",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json2990389176",
        "maxSize": 1,
        "name": "created",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json3332085495",
        "maxSize": 1,
        "name": "updated",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      }
    ],
    "id": "pbc_246627221",
    "indexes": [],
    "listRule": null,
    "name": "card_preview",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT\n\tid,\n\ttitle,\n\tSUBSTR(description, 1, 50) as description,\n\tposition,\n\tmoved_at,\n\tcreated_by,\n\tsection,\n\tsubproject,\n\tproject,\n\tpriority,\n\tdue_by,\n\tassignment_data,\n    (CASE json_extract(assignment_data, '$.type')\n        WHEN 'users' THEN (\n            SELECT json_group_array(u.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN users u ON u.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        WHEN 'groups' THEN (\n            SELECT json_group_array(g.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN groups g ON g.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        ELSE NULL\n    END) AS assignment_name_cache,\n\tcreated,\n\tupdated\nfrom CARDS",
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_246627221");

  return app.delete(collection);
})
