/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update field
  collection.fields.addAt(6, new Field({
    "help": "Result of running our part heuristic featurescript on the part to predict its type, dimensions, etc. If an assembly, stores parsed assembly data.",
    "hidden": false,
    "id": "json436374599",
    "maxSize": 0,
    "name": "part_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))
  
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2718308629")

  // update field
  collection.fields.addAt(6, new Field({
    "help": "Result of running our part heuristic featurescript on the part to predict its type, dimensions, etc",
    "hidden": false,
    "id": "json436374599",
    "maxSize": 0,
    "name": "part_heuristic_result",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
