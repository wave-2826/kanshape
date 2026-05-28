/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_246627221")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\tid,\n\ttitle,\n\tSUBSTR(description, 1, 100) as description,\n\tposition,\n\tmoved_at,\n\tcreated_by,\n\tsection,\n\tproject,\n\tsubprojects,\n    board,\n\tpriority,\n\tdue_by,\n\tassignment_data,\n    (CASE json_extract(assignment_data, '$.type')\n        WHEN 'users' THEN (\n            SELECT json_group_array(u.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN users u ON u.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        WHEN 'groups' THEN (\n            SELECT json_group_array(g.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN groups g ON g.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        ELSE NULL\n    END) AS assignment_name_cache,\n\tcreated,\n\tupdated\nfrom CARDS"
  }, collection)

  // remove field
  collection.fields.removeById("json1691449377")

  // add field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "json1459818029",
    "maxSize": 1,
    "name": "subprojects",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "json1482042183",
    "maxSize": 1,
    "name": "board",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_246627221")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\tid,\n\ttitle,\n\tSUBSTR(description, 1, 100) as description,\n\tposition,\n\tmoved_at,\n\tcreated_by,\n\tsection,\n\tsubproject,\n\tproject,\n\tpriority,\n\tdue_by,\n\tassignment_data,\n    (CASE json_extract(assignment_data, '$.type')\n        WHEN 'users' THEN (\n            SELECT json_group_array(u.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN users u ON u.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        WHEN 'groups' THEN (\n            SELECT json_group_array(g.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN groups g ON g.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        ELSE NULL\n    END) AS assignment_name_cache,\n\tcreated,\n\tupdated\nfrom CARDS"
  }, collection)

  // add field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "json1691449377",
    "maxSize": 1,
    "name": "subproject",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // remove field
  collection.fields.removeById("json1459818029")

  // remove field
  collection.fields.removeById("json1482042183")

  return app.save(collection)
})
