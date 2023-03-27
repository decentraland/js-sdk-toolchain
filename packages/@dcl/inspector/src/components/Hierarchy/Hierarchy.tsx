import React, { useMemo } from 'react'
import { useTree } from '../../hooks/sdk/useTree'
import { EntityInspector } from '../EntityInspector/EntityInspector'
import { ROOT } from '../../lib/sdk/tree'
import { Tree } from '../Tree'
import { useEntitiesWith } from '../../hooks/sdk/useEntitiesWith'

const Hierarchy: React.FC = () => {
  const { tree, addChild, setParent, remove, rename, toggle, getId, getChildren, getLabel, isOpen, isSelected } =
    useTree()

  const selectedEntities = useEntitiesWith((components) => components.EntitySelected)
  const selectedEntity = useMemo(() => (selectedEntities.length > 0 ? selectedEntities[0] : null), [selectedEntities])

  return (
    <>
      <div className="hierarchy">
        {Array.from(tree.get(ROOT)!).map((entity) => (
          <Tree
            key={getId(entity)}
            value={entity}
            onAddChild={addChild}
            onSetParent={setParent}
            onRemove={remove}
            onRename={rename}
            onToggle={toggle}
            getId={getId}
            getChildren={getChildren}
            getLabel={getLabel}
            isOpen={isOpen}
            isSelected={isSelected}
          />
        ))}
      </div>
      <div className="inspector">
        {selectedEntity && <EntityInspector key={getId(selectedEntity)} entity={selectedEntity} />}
      </div>
    </>
  )
}

export default Hierarchy
