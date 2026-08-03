/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
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
      },
      {
        "cascadeDelete": true,
        "collectionId": "_pb_users_auth_",
        "help": "Exclusive with `group`; one must be null",
        "hidden": false,
        "id": "relation2375276105",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "user",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3346940990",
        "help": "Exclusive with `user`; one must be null",
        "hidden": false,
        "id": "relation1841317061",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "group",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_950263630",
    "indexes": [
      "CREATE INDEX `idx_0c4p5dmix0` ON `card_assignment_cache` (`user`)",
      "CREATE INDEX `idx_v0dtv3xu8b` ON `card_assignment_cache` (`group`)"
    ],
    "listRule": "",
    "name": "card_assignment_cache",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": ""
  });

  app.save(collection);

  // Add data for all existing card assignments
  const cardsCollection = app.findCollectionByNameOrId("pbc_3481593366");
  const cards = app.findRecordsByFilter(cardsCollection, "", "created", 0, 0);

  for(const card of cards) {
    if(!card) continue;
    const assignmentDataString = card.get("assignment_data");
    const assignmentData = JSON.parse(assignmentDataString);
    if(!assignmentData || typeof assignmentData !== "object" || !("type" in assignmentData)) continue;
    
    const assignmentType = assignmentData.type;
    if(assignmentType !== "users" && assignmentType !== "groups") continue;

    const assignmentIds = assignmentData.ids;
    if(!Array.isArray(assignmentIds) || assignmentIds.length === 0) continue;

    for(const assignmentId of assignmentIds) {
      const record = new Record(collection);
      try {
        record.set("card", card.id);
        if(assignmentType === "users") {
          record.set("user", assignmentId);
          record.set("group", null);
        } else if(assignmentType === "groups") {
          record.set("user", null);
          record.set("group", assignmentId);
        }
        app.save(record);
      } catch(e) {
        console.warn(`Failed to create card assignment cache record for card ${card.id} and ${assignmentType.slice(0, -1)} ${assignmentId}: ${e}`);
      }
    }
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_950263630");

  return app.delete(collection);
})
