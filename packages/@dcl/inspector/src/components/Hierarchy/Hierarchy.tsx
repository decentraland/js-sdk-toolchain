import * as React from 'react'
import { useTree } from '../../hooks/sdk/tree'
import { InspectorEngine } from '../../lib/sdk/engine'
import { Tree } from '../Tree'

type Props = {
  inspectorEngine: InspectorEngine
}

const Hierarchy: React.FC<Props> = (props) => {
  const { tree, addChild, setParent, remove, rename, toggle } = useTree(props.inspectorEngine)
  return (
    <>
      {tree.map((node) => (
        <Tree
          key={node.id}
          value={node}
          onAddChild={addChild}
          onSetParent={setParent}
          onRemove={remove}
          onRename={rename}
          onToggle={toggle}
        />
      ))}
    </>
  )
}

export default Hierarchy
