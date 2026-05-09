# Kanshape

A [Kanban board](https://en.wikipedia.org/wiki/Kanban_board) application to track subteams' work and part manufacturing timelines with tight [Onshape](https://www.onshape.com/) integration. Currently a heavy work-in-progress.

Work is split into projects, which include sub-projects for categorization (e.g. subsystems). Parts can be associated with a task directly through an Onshape side panel addon, and each Onshape document can have a Kanban tab showing active tasks.

Each kanban board has configurable categories for parts of the manufacturing pipeline. For example, "To CAM", "Shop Work", "To Print", and "Done". Tasks can be assigned to one or multiple individuals.

The scope extends a bit beyond Kanban:
- Inventory tracking (e.g. belts), mapping part to quantity per list
- Material stock tracking
