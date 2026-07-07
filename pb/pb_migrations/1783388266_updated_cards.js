/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // add field
  collection.fields.addAt(13, new Field({
    "help": "Expected task duration in days. I considered making this a JSON field for future possibilities, but... eh",
    "hidden": false,
    "id": "number3098838237",
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
    "id": "relation3926880397",
    "maxSelect": 50,
    "minSelect": 0,
    "name": "dependencies",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // remove field
  collection.fields.removeById("number3098838237")

  // remove field
  collection.fields.removeById("relation3926880397")

  return app.save(collection)
})
