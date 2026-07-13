/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_246627221")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\tc.id,\n\tc.title,\n\tSUBSTR(c.description, 1, 100) as description,\n\tc.position,\n\tc.moved_at,\n\tc.created_by,\n\tc.section,\n    s.title AS section_name,\n\ts.color AS section_color,\n\tc.subprojects,\n    c.board,\n\tc.priority,\n\tc.due_by,\n\tc.duration_days,\n\tc.dependencies,\n\tc.assignment_data,\n    (CASE json_extract(c.assignment_data, '$.type')\n        WHEN 'users' THEN (\n            SELECT json_group_array(u.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN users u ON u.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        WHEN 'groups' THEN (\n            SELECT json_group_array(g.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN groups g ON g.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        ELSE NULL\n    END) AS assignment_name_cache,\n\tc.created,\n\tc.updated\nFROM cards AS c\nJOIN sections as s ON s.id = c.section"
  }, collection)

  // remove field
  collection.fields.removeById("json724990059")

  // remove field
  collection.fields.removeById("json1177347317")

  // remove field
  collection.fields.removeById("json665954036")

  // remove field
  collection.fields.removeById("json3725765462")

  // remove field
  collection.fields.removeById("json762542831")

  // remove field
  collection.fields.removeById("json1459818029")

  // remove field
  collection.fields.removeById("json1482042183")

  // remove field
  collection.fields.removeById("json1655102503")

  // remove field
  collection.fields.removeById("json111095121")

  // remove field
  collection.fields.removeById("json3098838237")

  // remove field
  collection.fields.removeById("json3926880397")

  // remove field
  collection.fields.removeById("json4143267583")

  // remove field
  collection.fields.removeById("json2990389176")

  // remove field
  collection.fields.removeById("json3332085495")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_WWhu",
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
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_gTCO",
    "max": null,
    "min": null,
    "name": "position",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_QEpe",
    "max": "",
    "min": "",
    "name": "moved_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "_clone_TZQd",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "created_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_1809324929",
    "help": "",
    "hidden": false,
    "id": "_clone_ohRc",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "section",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_S7JB",
    "max": 0,
    "min": 0,
    "name": "section_name",
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
    "id": "_clone_z5Yx",
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

  // add field
  collection.fields.addAt(9, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2817666393",
    "help": "",
    "hidden": false,
    "id": "_clone_8WC6",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "subprojects",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3304927325",
    "help": "",
    "hidden": false,
    "id": "_clone_kbvU",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "board",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_AKdS",
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
  collection.fields.addAt(12, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_z0Lw",
    "max": "",
    "min": "",
    "name": "due_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "help": "Expected task duration in days. I considered making this a JSON field for future possibilities, but... eh",
    "hidden": false,
    "id": "_clone_YSIo",
    "max": null,
    "min": null,
    "name": "duration_days",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3481593366",
    "help": "Other cards/tasks this one depends on to be started.",
    "hidden": false,
    "id": "_clone_7seA",
    "maxSelect": 50,
    "minSelect": 0,
    "name": "dependencies",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_eHnK",
    "maxSize": 0,
    "name": "assignment_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(17, new Field({
    "hidden": false,
    "id": "_clone_gsEO",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "hidden": false,
    "id": "_clone_WBlJ",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_246627221")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\tid,\n\ttitle,\n\tSUBSTR(description, 1, 100) as description,\n\tposition,\n\tmoved_at,\n\tcreated_by,\n\tsection,\n\tsubprojects,\n    board,\n\tpriority,\n\tdue_by,\n\tduration_days,\n\tdependencies,\n\tassignment_data,\n    (CASE json_extract(assignment_data, '$.type')\n        WHEN 'users' THEN (\n            SELECT json_group_array(u.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN users u ON u.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        WHEN 'groups' THEN (\n            SELECT json_group_array(g.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN groups g ON g.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        ELSE NULL\n    END) AS assignment_name_cache,\n\tcreated,\n\tupdated\nfrom CARDS"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "json724990059",
    "maxSize": 1,
    "name": "title",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "json1177347317",
    "maxSize": 1,
    "name": "position",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "json665954036",
    "maxSize": 1,
    "name": "moved_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "json3725765462",
    "maxSize": 1,
    "name": "created_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "json762542831",
    "maxSize": 1,
    "name": "section",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "json1459818029",
    "maxSize": 1,
    "name": "subprojects",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "json1482042183",
    "maxSize": 1,
    "name": "board",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "json1655102503",
    "maxSize": 1,
    "name": "priority",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "json111095121",
    "maxSize": 1,
    "name": "due_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "json3098838237",
    "maxSize": 1,
    "name": "duration_days",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "help": "",
    "hidden": false,
    "id": "json3926880397",
    "maxSize": 1,
    "name": "dependencies",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "help": "",
    "hidden": false,
    "id": "json4143267583",
    "maxSize": 1,
    "name": "assignment_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "help": "",
    "hidden": false,
    "id": "json2990389176",
    "maxSize": 1,
    "name": "created",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(16, new Field({
    "help": "",
    "hidden": false,
    "id": "json3332085495",
    "maxSize": 1,
    "name": "updated",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // remove field
  collection.fields.removeById("_clone_WWhu")

  // remove field
  collection.fields.removeById("_clone_gTCO")

  // remove field
  collection.fields.removeById("_clone_QEpe")

  // remove field
  collection.fields.removeById("_clone_TZQd")

  // remove field
  collection.fields.removeById("_clone_ohRc")

  // remove field
  collection.fields.removeById("_clone_S7JB")

  // remove field
  collection.fields.removeById("_clone_z5Yx")

  // remove field
  collection.fields.removeById("_clone_8WC6")

  // remove field
  collection.fields.removeById("_clone_kbvU")

  // remove field
  collection.fields.removeById("_clone_AKdS")

  // remove field
  collection.fields.removeById("_clone_z0Lw")

  // remove field
  collection.fields.removeById("_clone_YSIo")

  // remove field
  collection.fields.removeById("_clone_7seA")

  // remove field
  collection.fields.removeById("_clone_eHnK")

  // remove field
  collection.fields.removeById("_clone_gsEO")

  // remove field
  collection.fields.removeById("_clone_WBlJ")

  return app.save(collection)
})
