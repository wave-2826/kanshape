/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3398834865")

  // update collection data
  unmarshal({
    "viewQuery": "WITH board_card_stats AS (\n  SELECT\n    b.id AS board_id,\n    COUNT(c.id) AS card_count,\n    SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END) AS finished_card_count,\n    SUM(CASE\n      WHEN s.is_completed = 0 AND c.due_by != '' AND c.due_by < datetime('now')\n      THEN 1 ELSE 0\n    END) AS overdue_card_count,\n    MIN(CASE\n      WHEN s.is_completed = 0 AND c.due_by != '' AND c.due_by >= datetime('now')\n      THEN c.due_by ELSE NULL\n    END) AS next_due\n  FROM boards AS b\n  JOIN cards AS c ON c.board = b.id\n  JOIN sections AS s ON c.section = s.id\n  GROUP BY b.id\n)\n\nSELECT\n  b.id,\n  p.id AS project_id,\n  b.title,\n\n  COALESCE(s.card_count, 0) AS card_count,\n  COALESCE(s.finished_card_count, 0) AS finished_card_count,\n  COALESCE(s.overdue_card_count, 0) AS overdue_card_count,\n  s.next_due\nFROM boards AS b\nLEFT JOIN board_card_stats AS s ON s.board_id = b.id\nLEFT JOIN projects AS p ON EXISTS (\n  SELECT 1 FROM json_each(p.boards)\n  WHERE json_each.value = b.id);"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_bWbY")

  // add field
  collection.fields.addAt(1, new Field({
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
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_WCis",
    "max": 0,
    "min": 0,
    "name": "title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3398834865")

  // update collection data
  unmarshal({
    "viewQuery": "WITH board_card_stats AS (\n  SELECT\n    b.id AS board_id,\n    COUNT(c.id) AS card_count,\n    SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END) AS finished_card_count,\n    SUM(CASE\n      WHEN s.is_completed = 0 AND c.due_by != '' AND c.due_by < datetime('now')\n      THEN 1 ELSE 0\n    END) AS overdue_card_count,\n    MIN(CASE\n      WHEN s.is_completed = 0 AND c.due_by != '' AND c.due_by >= datetime('now')\n      THEN c.due_by ELSE NULL\n    END) AS next_due\n  FROM boards AS b\n  JOIN cards AS c ON c.board = b.id\n  JOIN sections AS s ON c.section = s.id\n  GROUP BY b.id\n)\n\nSELECT\n  b.id,\n  b.title,\n\n  COALESCE(s.card_count, 0) AS card_count,\n  COALESCE(s.finished_card_count, 0) AS finished_card_count,\n  COALESCE(s.overdue_card_count, 0) AS overdue_card_count,\n  s.next_due\nFROM boards AS b\nLEFT JOIN board_card_stats AS s ON s.board_id = b.id"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_bWbY",
    "max": 0,
    "min": 0,
    "name": "title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("relation376250268")

  // remove field
  collection.fields.removeById("_clone_WCis")

  return app.save(collection)
})
