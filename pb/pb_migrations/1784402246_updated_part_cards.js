/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1503881858")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" &&\n\t(@collection.parts.current_card ?= id || @collection.parts.past_revision_cards ?~ id) &&\n\t@collection.parts.document_id ?= @request.query.did &&\n\t(@request.query.eid:isset = false || @collection.parts.element_id ?= @request.query.eid)"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_mxUH")

  // remove field
  collection.fields.removeById("_clone_fD6o")

  // remove field
  collection.fields.removeById("_clone_vNkt")

  // remove field
  collection.fields.removeById("_clone_7UOU")

  // remove field
  collection.fields.removeById("_clone_yS4p")

  // remove field
  collection.fields.removeById("_clone_kBri")

  // remove field
  collection.fields.removeById("_clone_iydJ")

  // remove field
  collection.fields.removeById("_clone_Ovzd")

  // remove field
  collection.fields.removeById("_clone_CHXY")

  // remove field
  collection.fields.removeById("_clone_AZJQ")

  // remove field
  collection.fields.removeById("_clone_NXji")

  // remove field
  collection.fields.removeById("_clone_2QjW")

  // remove field
  collection.fields.removeById("_clone_adQf")

  // remove field
  collection.fields.removeById("_clone_aMiI")

  // remove field
  collection.fields.removeById("_clone_4I4n")

  // remove field
  collection.fields.removeById("_clone_I4eU")

  // remove field
  collection.fields.removeById("_clone_9cWl")

  // remove field
  collection.fields.removeById("_clone_Kg6P")

  // remove field
  collection.fields.removeById("_clone_Lgif")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_fGBo",
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
    "id": "_clone_mP49",
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
    "id": "_clone_ZBvB",
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
    "id": "_clone_MRUJ",
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
    "id": "_clone_vvVk",
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
    "id": "_clone_jOcz",
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
    "id": "_clone_e7EV",
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
    "id": "_clone_09jb",
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
    "id": "_clone_3LEC",
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
    "cascadeDelete": false,
    "collectionId": "pbc_2817666393",
    "help": "",
    "hidden": false,
    "id": "_clone_0Lgh",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "subprojects",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3304927325",
    "help": "",
    "hidden": false,
    "id": "_clone_N1db",
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
    "id": "_clone_tmzQ",
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
    "id": "_clone_3hVa",
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
    "id": "_clone_XaHt",
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
    "id": "_clone_gxC3",
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
    "id": "_clone_xRZE",
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
    "id": "_clone_dwoE",
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
    "id": "_clone_olRh",
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
    "id": "_clone_uamY",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1503881858")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" &&\n\t(@collection.parts.current_card = id || @collection.parts.past_revision_cards ~ id) &&\n\t@collection.parts.document_id = @request.query.did &&\n\t(@request.query.eid:isset = false || @collection.parts.element_id = @request.query.eid)"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "_clone_mxUH",
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
    "id": "_clone_fD6o",
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
    "id": "_clone_vNkt",
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
    "id": "_clone_7UOU",
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
    "id": "_clone_yS4p",
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
    "id": "_clone_kBri",
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
    "id": "_clone_iydJ",
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
    "id": "_clone_Ovzd",
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
    "id": "_clone_CHXY",
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
    "cascadeDelete": false,
    "collectionId": "pbc_2817666393",
    "help": "",
    "hidden": false,
    "id": "_clone_AZJQ",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "subprojects",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3304927325",
    "help": "",
    "hidden": false,
    "id": "_clone_NXji",
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
    "id": "_clone_2QjW",
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
    "id": "_clone_adQf",
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
    "id": "_clone_aMiI",
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
    "id": "_clone_4I4n",
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
    "id": "_clone_I4eU",
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
    "id": "_clone_9cWl",
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
    "id": "_clone_Kg6P",
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
    "id": "_clone_Lgif",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // remove field
  collection.fields.removeById("_clone_fGBo")

  // remove field
  collection.fields.removeById("_clone_mP49")

  // remove field
  collection.fields.removeById("_clone_ZBvB")

  // remove field
  collection.fields.removeById("_clone_MRUJ")

  // remove field
  collection.fields.removeById("_clone_vvVk")

  // remove field
  collection.fields.removeById("_clone_jOcz")

  // remove field
  collection.fields.removeById("_clone_e7EV")

  // remove field
  collection.fields.removeById("_clone_09jb")

  // remove field
  collection.fields.removeById("_clone_3LEC")

  // remove field
  collection.fields.removeById("_clone_0Lgh")

  // remove field
  collection.fields.removeById("_clone_N1db")

  // remove field
  collection.fields.removeById("_clone_tmzQ")

  // remove field
  collection.fields.removeById("_clone_3hVa")

  // remove field
  collection.fields.removeById("_clone_XaHt")

  // remove field
  collection.fields.removeById("_clone_gxC3")

  // remove field
  collection.fields.removeById("_clone_xRZE")

  // remove field
  collection.fields.removeById("_clone_dwoE")

  // remove field
  collection.fields.removeById("_clone_olRh")

  // remove field
  collection.fields.removeById("_clone_uamY")

  return app.save(collection)
})
