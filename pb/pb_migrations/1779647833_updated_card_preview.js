/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_246627221")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\tid,\n\ttitle,\n\tSUBSTR(description, 1, 100) as description,\n\tposition,\n\tmoved_at,\n\tcreated_by,\n\tsection,\n\tsubproject,\n\tproject,\n\tpriority,\n\tdue_by,\n\tassignment_data,\n    (CASE json_extract(assignment_data, '$.type')\n        WHEN 'users' THEN (\n            SELECT json_group_array(u.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN users u ON u.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        WHEN 'groups' THEN (\n            SELECT json_group_array(g.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN groups g ON g.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        ELSE NULL\n    END) AS assignment_name_cache,\n\tcreated,\n\tupdated\nfrom CARDS"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_246627221")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT\n\tid,\n\ttitle,\n\tSUBSTR(description, 1, 50) as description,\n\tposition,\n\tmoved_at,\n\tcreated_by,\n\tsection,\n\tsubproject,\n\tproject,\n\tpriority,\n\tdue_by,\n\tassignment_data,\n    (CASE json_extract(assignment_data, '$.type')\n        WHEN 'users' THEN (\n            SELECT json_group_array(u.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN users u ON u.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        WHEN 'groups' THEN (\n            SELECT json_group_array(g.name)\n            FROM json_each(json_extract(assignment_data, '$.ids')) ids\n            JOIN groups g ON g.id = ids.value\n    \t\tORDER BY ids.key\n        )\n\n        ELSE NULL\n    END) AS assignment_name_cache,\n\tcreated,\n\tupdated\nfrom CARDS"
  }, collection)

  return app.save(collection)
})
