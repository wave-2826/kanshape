/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3818476082")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.is_admin = true || key ~ \"site/%\" || key ~ \"auth/autoOAuth\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3818476082")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.is_admin = true || key ~ \"site/%\" || key ~ \"auth/authOAuth\""
  }, collection)

  return app.save(collection)
})
