/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3481593366",
    "help": "",
    "hidden": false,
    "id": "relation3032502315",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "past_revision_cards",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "help": "integer; starts at 1 and increments for each revision",
    "hidden": false,
    "id": "number1835210188",
    "max": null,
    "min": 1,
    "name": "revision",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3481593366",
    "help": "",
    "hidden": false,
    "id": "relation370448595",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "current_card",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // remove field
  collection.fields.removeById("relation3032502315")

  // remove field
  collection.fields.removeById("number1835210188")

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3481593366",
    "help": "",
    "hidden": false,
    "id": "relation370448595",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "card",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
