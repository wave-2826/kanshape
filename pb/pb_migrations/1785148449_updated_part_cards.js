/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1503881858")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\tc.id,\n\tc.title, c.description, c.position, c.moved_at, c.created_by, c.section, c.section_name, c.section_color, c.board_name, c.subprojects, c.board, c.priority, c.due_by, c.duration_days, c.dependencies, c.assignment_data, c.assignment_name_cache, c.created, c.updated,\n\tp.title AS project_title, p.color AS project_color, p.id AS project\nFROM card_preview AS c\nLEFT JOIN projects AS p ON EXISTS (\n    SELECT 1\n    FROM json_each(p.boards)\n    WHERE json_each.value = c.board\n)"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_7Qlg")

  // remove field
  collection.fields.removeById("_clone_or3U")

  // remove field
  collection.fields.removeById("_clone_FqNO")

  // remove field
  collection.fields.removeById("_clone_HGjR")

  // remove field
  collection.fields.removeById("_clone_Bm4M")

  // remove field
  collection.fields.removeById("_clone_s6jZ")

  // remove field
  collection.fields.removeById("_clone_lw0b")

  // remove field
  collection.fields.removeById("_clone_G2gk")

  // remove field
  collection.fields.removeById("_clone_ubfP")

  // remove field
  collection.fields.removeById("_clone_gKiy")

  // remove field
  collection.fields.removeById("_clone_Tp0h")

  // remove field
  collection.fields.removeById("_clone_SZC2")

  // remove field
  collection.fields.removeById("_clone_kjIM")

  // remove field
  collection.fields.removeById("_clone_h2Yc")

  // remove field
  collection.fields.removeById("_clone_5S1V")

  // remove field
  collection.fields.removeById("_clone_SM7E")

  // remove field
  collection.fields.removeById("_clone_b26D")

  // remove field
  collection.fields.removeById("_clone_K9vr")

  // remove field
  collection.fields.removeById("_clone_CKfw")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_ZLdi",
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
    "id": "_clone_tR8L",
    "maxSize": 1,
    "name": "description",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_SxZF",
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
    "id": "_clone_RIuH",
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
    "id": "_clone_CLSG",
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
    "id": "_clone_BzuY",
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
    "id": "_clone_2dfX",
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
    "id": "_clone_n3kB",
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
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_K7V6",
    "max": 0,
    "min": 0,
    "name": "board_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_GGI6",
    "maxSize": 1,
    "name": "subprojects",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3304927325",
    "help": "",
    "hidden": false,
    "id": "_clone_C2vy",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "board",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_9Vrb",
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
  collection.fields.addAt(13, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_alB4",
    "max": "",
    "min": "",
    "name": "due_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "help": "Expected task duration in days. I considered making this a JSON field for future possibilities, but... eh",
    "hidden": false,
    "id": "_clone_tDNP",
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
  collection.fields.addAt(15, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3481593366",
    "help": "Other cards/tasks this one depends on to be started.",
    "hidden": false,
    "id": "_clone_uYGQ",
    "maxSelect": 50,
    "minSelect": 0,
    "name": "dependencies",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(16, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_xIcy",
    "maxSize": 0,
    "name": "assignment_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(17, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_puWj",
    "maxSize": 1,
    "name": "assignment_name_cache",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "hidden": false,
    "id": "_clone_doaT",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(19, new Field({
    "hidden": false,
    "id": "_clone_a1ln",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(20, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_qGTM",
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
  collection.fields.addAt(21, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_m8qu",
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
  collection.fields.addAt(22, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_484305853",
    "help": "",
    "hidden": false,
    "id": "relation800313582",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "project",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1503881858")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\tid,\n\ttitle, description, position, moved_at, created_by, section, section_name, section_color, board_name, subprojects, board, priority, due_by, duration_days, dependencies, assignment_data, assignment_name_cache, created, updated\nFROM card_preview"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_7Qlg",
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
    "id": "_clone_or3U",
    "maxSize": 1,
    "name": "description",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_FqNO",
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
    "id": "_clone_HGjR",
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
    "id": "_clone_Bm4M",
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
    "id": "_clone_s6jZ",
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
    "id": "_clone_lw0b",
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
    "id": "_clone_G2gk",
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
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_ubfP",
    "max": 0,
    "min": 0,
    "name": "board_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_gKiy",
    "maxSize": 1,
    "name": "subprojects",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3304927325",
    "help": "",
    "hidden": false,
    "id": "_clone_Tp0h",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "board",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_SZC2",
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
  collection.fields.addAt(13, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_kjIM",
    "max": "",
    "min": "",
    "name": "due_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "help": "Expected task duration in days. I considered making this a JSON field for future possibilities, but... eh",
    "hidden": false,
    "id": "_clone_h2Yc",
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
  collection.fields.addAt(15, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3481593366",
    "help": "Other cards/tasks this one depends on to be started.",
    "hidden": false,
    "id": "_clone_5S1V",
    "maxSelect": 50,
    "minSelect": 0,
    "name": "dependencies",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(16, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_SM7E",
    "maxSize": 0,
    "name": "assignment_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(17, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_b26D",
    "maxSize": 1,
    "name": "assignment_name_cache",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "hidden": false,
    "id": "_clone_K9vr",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(19, new Field({
    "hidden": false,
    "id": "_clone_CKfw",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // remove field
  collection.fields.removeById("_clone_ZLdi")

  // remove field
  collection.fields.removeById("_clone_tR8L")

  // remove field
  collection.fields.removeById("_clone_SxZF")

  // remove field
  collection.fields.removeById("_clone_RIuH")

  // remove field
  collection.fields.removeById("_clone_CLSG")

  // remove field
  collection.fields.removeById("_clone_BzuY")

  // remove field
  collection.fields.removeById("_clone_2dfX")

  // remove field
  collection.fields.removeById("_clone_n3kB")

  // remove field
  collection.fields.removeById("_clone_K7V6")

  // remove field
  collection.fields.removeById("_clone_GGI6")

  // remove field
  collection.fields.removeById("_clone_C2vy")

  // remove field
  collection.fields.removeById("_clone_9Vrb")

  // remove field
  collection.fields.removeById("_clone_alB4")

  // remove field
  collection.fields.removeById("_clone_tDNP")

  // remove field
  collection.fields.removeById("_clone_uYGQ")

  // remove field
  collection.fields.removeById("_clone_xIcy")

  // remove field
  collection.fields.removeById("_clone_puWj")

  // remove field
  collection.fields.removeById("_clone_doaT")

  // remove field
  collection.fields.removeById("_clone_a1ln")

  // remove field
  collection.fields.removeById("_clone_qGTM")

  // remove field
  collection.fields.removeById("_clone_m8qu")

  // remove field
  collection.fields.removeById("relation800313582")

  return app.save(collection)
})
