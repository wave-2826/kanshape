/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_530297251")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_qfiduq3qoc` ON `export_queue` (`status`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_530297251")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
