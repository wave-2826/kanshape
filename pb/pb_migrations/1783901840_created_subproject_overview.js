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
        "collectionId": "pbc_484305853",
        "help": "",
        "hidden": false,
        "id": "relation376250268",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "project_id",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "_clone_j5CZ",
        "max": 0,
        "min": 0,
        "name": "name",
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
        "id": "json3186472356",
        "maxSize": 1,
        "name": "card_count",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json3227996156",
        "maxSize": 1,
        "name": "finished_card_count",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json1872216367",
        "maxSize": 1,
        "name": "overdue_card_count",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json567190381",
        "maxSize": 1,
        "name": "next_due",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      }
    ],
    "id": "pbc_3538165877",
    "indexes": [],
    "listRule": null,
    "name": "subproject_overview",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "WITH subproject_card_stats AS (\n  SELECT\n    sp.id AS subproject_id,\n    COUNT(c.id) AS card_count,\n    SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END) AS finished_card_count,\n    SUM(CASE\n      WHEN s.is_completed = 0 AND c.due_by != '' AND c.due_by < datetime('now')\n      THEN 1 ELSE 0\n    END) AS overdue_card_count,\n    MIN(CASE\n      WHEN s.is_completed = 0 AND c.due_by != '' AND c.due_by >= datetime('now')\n      THEN c.due_by ELSE NULL\n    END) AS next_due\n  FROM subprojects AS sp\n  JOIN cards AS c ON EXISTS (\n    SELECT 1 FROM json_each(c.subprojects)\n    WHERE json_each.value = sp.id)\n  JOIN sections AS s ON c.section = s.id\n  GROUP BY sp.id\n)\n\nSELECT\n  sp.id,\n  p.id AS project_id,\n  sp.name,\n\n  COALESCE(s.card_count, 0) AS card_count,\n  COALESCE(s.finished_card_count, 0) AS finished_card_count,\n  COALESCE(s.overdue_card_count, 0) AS overdue_card_count,\n  s.next_due\nFROM subprojects AS sp\nLEFT JOIN subproject_card_stats AS s ON s.subproject_id = sp.id\nLEFT JOIN projects AS p ON EXISTS (\n  SELECT 1 FROM json_each(p.subprojects)\n  WHERE json_each.value = sp.id);",
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3538165877");

  return app.delete(collection);
})
