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
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "_clone_waGU",
        "max": 0,
        "min": 0,
        "name": "title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "_clone_Zv3m",
        "max": 0,
        "min": 0,
        "name": "color",
        "pattern": "^#[A-Fa-f0-9]{6}$",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json4092480787",
        "maxSize": 1,
        "name": "boards",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json1459818029",
        "maxSize": 1,
        "name": "subprojects",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
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
    "id": "pbc_2161791035",
    "indexes": [],
    "listRule": "@request.auth.id != \"\"",
    "name": "project_overview",
    "system": false,
    "type": "view",
    "updateRule": null,
    // idk if i should be content with this or ashamed but i'm definitely proud of it
    "viewQuery": "WITH project_card_stats AS (\n  SELECT\n    p.id AS project_id,\n    COUNT(c.id) AS card_count,\n    SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END) AS finished_card_count,\n    SUM(CASE\n      WHEN s.is_completed = 0 AND c.due_by != '' AND c.due_by < datetime('now')\n      THEN 1 ELSE 0\n    END) AS overdue_card_count,\n    MIN(CASE\n      WHEN s.is_completed = 0 AND c.due_by != '' AND c.due_by >= datetime('now')\n      THEN c.due_by ELSE NULL\n    END) AS next_due\n  FROM projects AS p\n  JOIN json_each(p.boards) AS j\n  JOIN boards AS b ON b.id = j.value\n  JOIN cards AS c ON c.board = b.id\n  JOIN sections AS s ON c.section = s.id\n  GROUP BY p.id\n)\n\nSELECT\n  p.id,\n  p.title,\n  p.color,\n  (\n\tSELECT json_group_array(json_object('id', b.id, 'title', b.title))\n      FROM json_each(p.boards) AS j\n      JOIN boards AS b ON b.id = j.value\n  ) AS boards,\n  (\n    SELECT json_group_array(json_object('id', sp.id, 'name', sp.name))\n      FROM json_each(p.subprojects) AS j\n      JOIN subprojects AS sp ON sp.id = j.value\n  ) AS subprojects,\n\n  COALESCE(s.card_count, 0) AS card_count,\n  COALESCE(s.finished_card_count, 0) AS finished_card_count,\n  COALESCE(s.overdue_card_count, 0) AS overdue_card_count,\n  s.next_due\nFROM projects AS p\nLEFT JOIN project_card_stats AS s ON s.project_id = p.id",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2161791035");

  return app.delete(collection);
})
