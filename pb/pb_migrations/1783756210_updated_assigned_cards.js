/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2112397836")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" && (\n  @collection.card_assignment_cache.user ?= @request.auth.id ||\n  @request.auth.groups ~ @collection.card_assignment_cache.group\n) && @collection.card_assignment_cache.card ?= id"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_bQRr")

  // remove field
  collection.fields.removeById("_clone_o1ck")

  // remove field
  collection.fields.removeById("_clone_bWCD")

  // remove field
  collection.fields.removeById("_clone_sjeG")

  // remove field
  collection.fields.removeById("_clone_3YUg")

  // remove field
  collection.fields.removeById("_clone_hmvR")

  // remove field
  collection.fields.removeById("_clone_deHS")

  // remove field
  collection.fields.removeById("_clone_PCNB")

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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2112397836")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" && (\n  @collection.card_assignment_cache.user = @request.auth.id ||\n  @request.auth.groups ~ @collection.card_assignment_cache.group\n) && @collection.card_assignment_cache.card = id"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
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
  }))

  // add field
  collection.fields.addAt(2, new Field({
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
  }))

  // add field
  collection.fields.addAt(3, new Field({
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
  }))

  // add field
  collection.fields.addAt(4, new Field({
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
  }))

  // add field
  collection.fields.addAt(5, new Field({
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
  }))

  // add field
  collection.fields.addAt(6, new Field({
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
  }))

  // add field
  collection.fields.addAt(7, new Field({
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
  }))

  // add field
  collection.fields.addAt(8, new Field({
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
  }))

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

  return app.save(collection)
})
