/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2112397836")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n  c.id AS id,\n  c.title,\n  c.priority,\n  (CASE c.priority\n    WHEN 'critical' THEN 4\n    WHEN 'high' THEN 3\n    WHEN 'medium' THEN 2\n    WHEN 'low' THEN 1\n    ELSE 0\n  END) AS priority_number,\n  c.due_by,\n  b.title AS board_title,\n  p.title AS project_title,\n  p.color AS project_color,\n  s.title AS section_title,\n  s.color AS section_color\nFROM cards AS c\nINNER JOIN sections AS s ON s.id = c.section AND s.is_completed = false\nLEFT JOIN boards AS b ON b.id = c.board\nLEFT JOIN projects AS p ON EXISTS (\n    SELECT 1\n    FROM json_each(p.boards)\n    WHERE json_each.value = b.id\n)"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_pyAA")

  // remove field
  collection.fields.removeById("_clone_XBeE")

  // remove field
  collection.fields.removeById("_clone_XkPe")

  // remove field
  collection.fields.removeById("_clone_YkBI")

  // remove field
  collection.fields.removeById("_clone_zJj1")

  // remove field
  collection.fields.removeById("_clone_6lBK")

  // remove field
  collection.fields.removeById("_clone_NnEr")

  // remove field
  collection.fields.removeById("_clone_jjDc")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_UdDN",
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

  // add field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_IYoc",
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
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "json1846375983",
    "maxSize": 1,
    "name": "priority_number",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_pVMl",
    "max": "",
    "min": "",
    "name": "due_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_FuYm",
    "max": 0,
    "min": 0,
    "name": "board_title",
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
    "help": "",
    "hidden": false,
    "id": "_clone_reSq",
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
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_J7E5",
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
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_P3cN",
    "max": 0,
    "min": 0,
    "name": "section_title",
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
    "help": "",
    "hidden": false,
    "id": "_clone_IMCX",
    "max": 0,
    "min": 0,
    "name": "section_color",
    "pattern": "^#[A-Fa-f0-9]{6}$",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2112397836")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n  c.id AS id,\n  c.title,\n  c.priority,\n  c.due_by,\n  b.title AS board_title,\n  p.title AS project_title,\n  p.color AS project_color,\n  s.title AS section_title,\n  s.color AS section_color\nFROM cards AS c\nINNER JOIN sections AS s ON s.id = c.section AND s.is_completed = false\nLEFT JOIN boards AS b ON b.id = c.board\nLEFT JOIN projects AS p ON EXISTS (\n    SELECT 1\n    FROM json_each(p.boards)\n    WHERE json_each.value = b.id\n)"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_pyAA",
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

  // add field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_XBeE",
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
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_XkPe",
    "max": "",
    "min": "",
    "name": "due_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_YkBI",
    "max": 0,
    "min": 0,
    "name": "board_title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_zJj1",
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
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_6lBK",
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
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_NnEr",
    "max": 0,
    "min": 0,
    "name": "section_title",
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
    "help": "",
    "hidden": false,
    "id": "_clone_jjDc",
    "max": 0,
    "min": 0,
    "name": "section_color",
    "pattern": "^#[A-Fa-f0-9]{6}$",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("_clone_UdDN")

  // remove field
  collection.fields.removeById("_clone_IYoc")

  // remove field
  collection.fields.removeById("json1846375983")

  // remove field
  collection.fields.removeById("_clone_pVMl")

  // remove field
  collection.fields.removeById("_clone_FuYm")

  // remove field
  collection.fields.removeById("_clone_reSq")

  // remove field
  collection.fields.removeById("_clone_J7E5")

  // remove field
  collection.fields.removeById("_clone_P3cN")

  // remove field
  collection.fields.removeById("_clone_IMCX")

  return app.save(collection)
})
