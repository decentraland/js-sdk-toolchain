import React, { useState } from 'react'
import { CrdtMessageType, Entity } from '@dcl/ecs'
import { useTree } from '../../hooks/sdk/useTree'
import { useChange } from '../../hooks/sdk/useChange'
import { EntityInspector } from '../EntityInspector/EntityInspector'
import { ROOT } from '../../lib/sdk/tree'
import { Tree } from '../Tree'

const Hierarchy: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<Entity>()
  const { tree, addChild, setParent, remove, rename, toggle, getId, getChildren, getLabel, isOpen, isSelected } =
    useTree()

  useChange((event, sdk) => {
    const { entity, component, operation } = event
    const {
      components: { EntitySelected }
    } = sdk
    if (
      component?.componentId === EntitySelected.componentId &&
      operation === CrdtMessageType.PUT_COMPONENT &&
      entity !== selectedEntity
    ) {
      setSelectedEntity(entity)
    }
  })

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
