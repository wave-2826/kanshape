/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_aa2ruyh8v3` ON `cards` (`board`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3481593366")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
