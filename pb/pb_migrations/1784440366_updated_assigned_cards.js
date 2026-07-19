/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2112397836")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" && (\n  @collection.card_assignment_cache.user ?= @request.auth.id ||\n  @request.auth.groups:each ?= @collection.card_assignment_cache.group\n) && @collection.card_assignment_cache.card ?= id",
    "viewRule": "@request.auth.id != \"\" && (\n  @collection.card_assignment_cache.user ?= @request.auth.id ||\n  @request.auth.groups:each ?= @collection.card_assignment_cache.group\n) && @collection.card_assignment_cache.card ?= id"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_zN9X")

  // remove field
  collection.fields.removeById("_clone_cB7e")

  // remove field
  collection.fields.removeById("_clone_c0UN")

  // remove field
  collection.fields.removeById("_clone_lMDC")

  // remove field
  collection.fields.removeById("_clone_uaEB")

  // remove field
  collection.fields.removeById("_clone_ma9d")

  // remove field
  collection.fields.removeById("_clone_2JmK")

  // remove field
  collection.fields.removeById("_clone_vd6F")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_uWox",
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
    "id": "_clone_UB7T",
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
    "id": "_clone_KUtW",
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
    "id": "_clone_swaX",
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
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_KNMW",
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
    "id": "_clone_rmre",
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
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_eiTG",
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
    "id": "_clone_inmb",
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
    "listRule": "@request.auth.id != \"\" && (\n  @collection.card_assignment_cache.user ?= @request.auth.id ||\n  @request.auth.groups ~ @collection.card_assignment_cache.group\n) && @collection.card_assignment_cache.card ?= id",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

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

  // remove field
  collection.fields.removeById("_clone_uWox")

  // remove field
  collection.fields.removeById("_clone_UB7T")

  // remove field
  collection.fields.removeById("_clone_KUtW")

  // remove field
  collection.fields.removeById("_clone_swaX")

  // remove field
  collection.fields.removeById("_clone_KNMW")

  // remove field
  collection.fields.removeById("_clone_rmre")

  // remove field
  collection.fields.removeById("_clone_eiTG")

  // remove field
  collection.fields.removeById("_clone_inmb")

  return app.save(collection)
})
