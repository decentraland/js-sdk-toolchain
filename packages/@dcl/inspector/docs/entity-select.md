## General notes & definitions

For every composite the Editor maintains a set of selected entities.

*Subtree* of an entity is set comprised of entity itself and all its descendants.

*Root subset* is a subset of entity set such that:
* Subtrees of *root subset* entities do not intersect and cover all entities of a set. 

## Visuals in composite inspector

Rows of selected entities should be highlighted.

## Visuals in composite renderer

Single entity selected: show gizmo anchored to local (0, 0, 0) of that entity.

Many entities selected:
* Translation tool: show gizmo anchored at geometric mean of local (0, 0, 0) of entities that belong to *root subset* of selected set. Apply relative translation of gizmo to those entities.
* Rotation tool: show gizmo anchored at geometric mean of local (0, 0, 0) of entities that belong to *root subset* of selected set. Gizmo is world-axes aligned. Rotate entities of *root subset* around gizmo's axes (not local world-aligned axes).
* Scaling tool: show gizmo anchored at geometric mean of local (0, 0, 0) of entities that belong to *root subset* of selected set. Apply scaling of gizmo to those entities.

## Visuals in entity inspector

If exactly one entity is selected, show its components, otherwise, show nothing.

## Operations

* Left-click on an entity in either composite inspector or renderer clears a selected set and then adds a target entity to it. Supports undo/redo.
* Ctrl + left-click on an entity in either composite inspector or renderer adds an entity to a selected set if it is not in already, and removes it from selected set otherwise. Supports undo/redo.
* Select subtree: a context menu option. Clears selected set and adds all entities that belong to target entity's subtree to selected set. Supports undo/redo.
* Invert selection: a context menu option. Every selected entity in a currently selected composite becomes unselected, every unselected entity becomes selected. Supports undo/redo.
