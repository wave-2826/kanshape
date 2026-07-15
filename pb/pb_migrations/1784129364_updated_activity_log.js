/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2862527041")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_wbadms2r9m` ON `activity_log` (`date`)",
      "CREATE INDEX `idx_foej8gk3md` ON `activity_log` (`project_id`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2862527041")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
