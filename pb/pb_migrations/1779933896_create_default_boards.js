/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const boardsCollection = app.findCollectionByNameOrId("pbc_3304927325");
  const projectsCollection = app.findCollectionByNameOrId("pbc_484305853");
  const cardsCollection = app.findCollectionByNameOrId("pbc_3481593366");

  const projects = app.findRecordsByFilter(projectsCollection, "", "created", 0, 0);

  for(const project of projects) {
    if(!project) continue;

    const boardIds = (project.get("boards") ?? []).filter(Boolean);
    const existingBoards = app.findRecordsByIds(boardsCollection, boardIds).filter(Boolean);
    let defaultBoard = existingBoards.find((board) => board.get("title") === "Default");

    if(!defaultBoard) {
      defaultBoard = new Record(boardsCollection);
      defaultBoard.set("title", "Default");
    }

    defaultBoard.set("description", project.get("description") ?? null);
    defaultBoard.set("type", project.get("type"));
    defaultBoard.set("custom_card_fields", project.get("custom_card_fields") ?? null);
    defaultBoard.set("sections", project.get("sections") ?? []);
    defaultBoard.set("linked_sites", project.get("linked_sites") ?? null);
    defaultBoard.set("position", 0);
    app.save(defaultBoard);

    const nextBoardIds = [...new Set([...boardIds, defaultBoard.id])];
    project.set("boards", nextBoardIds);
    app.save(project);

    const cards = app.findRecordsByFilter(cardsCollection, "project = {:project}", "", 0, 0, {
      project: project.id
    });

    for(const card of cards) {
      if(!card) continue;
      card.set("board", defaultBoard.id);
      app.save(card);
    }
  }
}, (app) => {
  // Lowkey might not work but the other down migrations should handle cleanup
  const boardsCollection = app.findCollectionByNameOrId("pbc_3304927325");
  const projectsCollection = app.findCollectionByNameOrId("pbc_484305853");
  const cardsCollection = app.findCollectionByNameOrId("pbc_3481593366");

  const projects = app.findRecordsByFilter(projectsCollection, "", "created", 0, 0);

  for(const project of projects) {
    if(!project) continue;

    const boardIds = (project.get("boards") ?? []).filter(Boolean);
    if(!boardIds.length) continue;

    const boards = app.findRecordsByIds(boardsCollection, boardIds).filter(Boolean);
    const defaultBoard = boards.find((board) => board.get("title") === "Default");
    if(!defaultBoard) continue;

    const fallbackBoard = boards.find((board) => board.id !== defaultBoard.id);
    const cards = app.findRecordsByFilter(cardsCollection, "board = {:board}", "", 0, 0, {
      board: defaultBoard.id
    });

    if(fallbackBoard) {
      for(const card of cards) {
        if(!card) continue;
        card.set("board", fallbackBoard.id);
        app.save(card);
      }

      const remainingBoardIds = boardIds.filter((boardId) => boardId !== defaultBoard.id);
      project.set("boards", remainingBoardIds);
      app.save(project);

      const orphanedCards = app.findRecordsByFilter(cardsCollection, "board = {:board}", "", 0, 0, {
        board: defaultBoard.id
      });
      if(orphanedCards.length === 0) {
        app.delete(defaultBoard);
      }
    } else if(cards.length === 0) {
      project.set("boards", boardIds.filter((boardId) => boardId !== defaultBoard.id));
      app.save(project);
      app.delete(defaultBoard);
    }
  }
})
