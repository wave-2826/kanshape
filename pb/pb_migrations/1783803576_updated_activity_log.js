/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2862527041")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && @request.auth.is_admin = true",
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2862527041")

  // update collection data
  unmarshal({
    "deleteRule": null,
    "listRule": null,
    "viewRule": null
  }, collection)

  return app.save(collection)
})
