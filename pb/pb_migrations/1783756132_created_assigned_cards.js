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
        "id": "_clone_bQRr",
        "max": 0,
        "min": 0,
        "name": "title",
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
        "id": "_clone_o1ck",
        "maxSelect": 1,
        "name": "priority",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "low",
          "medium",
          "high",
          "critical"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "_clone_bWCD",
        "max": "",
        "min": "",
        "name": "due_by",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "_clone_sjeG",
        "max": 0,
        "min": 0,
        "name": "board_title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "_clone_3YUg",
        "max": 0,
        "min": 0,
        "name": "project_title",
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
        "id": "_clone_hmvR",
        "max": 0,
        "min": 0,
        "name": "project_color",
        "pattern": "^#[A-Fa-f0-9]{6}$",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "_clone_deHS",
        "max": 0,
        "min": 0,
        "name": "section_title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "_clone_PCNB",
        "max": 0,
        "min": 0,
        "name": "section_color",
        "pattern": "^#[A-Fa-f0-9]{6}$",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_2112397836",
    "indexes": [],
    "listRule": "@request.auth.id != \"\" && (\n  @collection.card_assignment_cache.user = @request.auth.id ||\n  @request.auth.groups ~ @collection.card_assignment_cache.group\n) && @collection.card_assignment_cache.card = id",
    "name": "assigned_cards",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT\n  c.id AS id,\n  c.title,\n  c.priority,\n  c.due_by,\n  b.title AS board_title,\n  p.title AS project_title,\n  p.color AS project_color,\n  s.title AS section_title,\n  s.color AS section_color\nFROM cards AS c\nINNER JOIN sections AS s ON s.id = c.section AND s.is_completed = false\nLEFT JOIN boards AS b ON b.id = c.board\nLEFT JOIN projects AS p ON EXISTS (\n    SELECT 1\n    FROM json_each(p.boards)\n    WHERE json_each.value = b.id\n)",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2112397836");

  return app.delete(collection);
})
