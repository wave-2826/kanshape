/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2112397836")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n  c.id AS id,\n  c.title,\n  c.priority,\n  (CASE c.priority\n    WHEN 'critical' THEN 4\n    WHEN 'high' THEN 3\n    WHEN 'medium' THEN 2\n    WHEN 'low' THEN 1\n    ELSE 0\n  END) AS priority_number,\n  c.due_by,\n  b.title AS board_title,\n  b.id AS board_id,\n  p.title AS project_title,\n  p.color AS project_color,\n  p.id AS project_id,\n  s.title AS section_title,\n  s.color AS section_color\nFROM cards AS c\nINNER JOIN sections AS s ON s.id = c.section AND s.is_completed = false\nLEFT JOIN boards AS b ON b.id = c.board\nLEFT JOIN projects AS p ON EXISTS (\n    SELECT 1\n    FROM json_each(p.boards)\n    WHERE json_each.value = b.id\n)"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_UdDN")

  // remove field
  collection.fields.removeById("_clone_IYoc")

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

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_zN9X",
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
    "id": "_clone_cB7e",
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
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_c0UN",
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
    "id": "_clone_lMDC",
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
    "cascadeDelete": false,
    "collectionId": "pbc_3304927325",
    "help": "",
    "hidden": false,
    "id": "relation3891025797",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "board_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_uaEB",
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
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_ma9d",
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
  collection.fields.addAt(9, new Field({
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
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_2JmK",
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
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_vd6F",
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
    "viewQuery": "SELECT\n  c.id AS id,\n  c.title,\n  c.priority,\n  (CASE c.priority\n    WHEN 'critical' THEN 4\n    WHEN 'high' THEN 3\n    WHEN 'medium' THEN 2\n    WHEN 'low' THEN 1\n    ELSE 0\n  END) AS priority_number,\n  c.due_by,\n  b.title AS board_title,\n  p.title AS project_title,\n  p.color AS project_color,\n  s.title AS section_title,\n  s.color AS section_color\nFROM cards AS c\nINNER JOIN sections AS s ON s.id = c.section AND s.is_completed = false\nLEFT JOIN boards AS b ON b.id = c.board\nLEFT JOIN projects AS p ON EXISTS (\n    SELECT 1\n    FROM json_each(p.boards)\n    WHERE json_each.value = b.id\n)"
  }, collection)

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

  // remove field
  collection.fields.removeById("_clone_zN9X")

  // remove field
  collection.fields.removeById("_clone_cB7e")

  // remove field
  collection.fields.removeById("_clone_c0UN")

  // remove field
  collection.fields.removeById("_clone_lMDC")

  // remove field
  collection.fields.removeById("relation3891025797")

  // remove field
  collection.fields.removeById("_clone_uaEB")

  // remove field
  collection.fields.removeById("_clone_ma9d")

  // remove field
  collection.fields.removeById("relation376250268")

  // remove field
  collection.fields.removeById("_clone_2JmK")

  // remove field
  collection.fields.removeById("_clone_vd6F")

  return app.save(collection)
})
