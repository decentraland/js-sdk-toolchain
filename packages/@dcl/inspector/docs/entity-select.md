## General notes & definitions

For every composite the Editor maintains a set of selected entities.

*Subtree* of an entity is a set comprised of entity itself and all its descendants.

*Root subset* is a subset of an entity set such that: subtrees of *root subset* entities do not intersect and cover all entities of a set. In the example below `(S2, S4)` is a *root subset* of selected set `(S2, S4, S4)`.

```
E1 -> S2 -> S3 -> E4
 |
 ---> S4
```

## Visuals in composite inspector

Rows of selected entities should be highlighted.

## Visuals in composite renderer & interaction with Transform tools

When exactly one entity is selected: show gizmo anchored to local (0, 0, 0) of that entity.

When more than one entity is selected:

* Translation tool: show gizmo anchored to geometric mean of local (0, 0, 0)-s of entities that belong to a *root subset* of a selected set. Apply relative translation of gizmo to those entities. Gizmo is world-axes aligned.

* Rotation tool: show gizmo anchored to geometric mean of local (0, 0, 0)-s of entities that belong to a *root subset* of a selected set. Rotate those entities about gizmo's axes (not local world-aligned axes). Gizmo is world-axes aligned.

* Scaling tool: show gizmo anchored to geometric mean of local (0, 0, 0)-s of entities that belong to a *root subset* of a selected set. Apply relative scaling of gizmo to those entities.

## Visuals in entity inspector

If exactly one entity is selected, show its components, otherwise, show nothing.

## Operations

All operations support undo/redo.

* `Left-click` on an entity in either composite inspector or renderer clears a selected set and then adds a target entity to it.

* `Ctrl + left-click` on an entity in either composite inspector or renderer adds an entity to a selected set if it is not in already, and removes it from selected set otherwise.

* Clear selection: a context menu option. All selected entities become unselected.

* Invert selection: a context menu option. Every selected entity in a currently selected composite becomes unselected, every unselected entity becomes selected.
