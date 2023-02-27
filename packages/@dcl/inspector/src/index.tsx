import React, { useCallback, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import './index.css'
import TreeComponent, { Tree } from './components/tree/Tree'

type Node = {
  id: string
  label: string
  parent: string | null
}

const init = [
  {
    id: '0',
    label: '0',
    parent: null
  },
  {
    id: '1',
    label: '1',
    parent: null
  },
  {
    id: '2',
    label: '2',
    parent: '0'
  }
]

const App = () => {
  const [nodes, setNodes] = useState<Node[]>(init)

  const toTree = (nodes: Node[], parent: string | null = null): Tree[] =>
    nodes
      .filter((node) => node.parent === parent)
      .map<Tree>(({ parent, ...node }) => ({ ...node, children: toTree(nodes, node.id) }))

  const tree = useMemo(
    () => ({
      id: 'root',
      value: 'root',
      label: 'root',
      children: toTree(nodes)
    }),
    [nodes]
  )

  const handleRename = useCallback(
    (id: string, newLabel: string) =>
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, label: newLabel } : node))),
    [setNodes]
  )

  const handleSetParent = useCallback(
    (id: string, newParent: string | null) =>
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, parent: newParent } : node))),
    [setNodes]
  )

  const handleAddChild = useCallback(
    (parent: string, label: string) =>
      setNodes((nodes) => [...nodes, { id: (nodes.length + 1).toString(), label, parent }]),
    [setNodes]
  )

  const handleRemove = useCallback((id: string) => setNodes((nodes) => nodes.filter(($) => id !== $.id)), [setNodes])

  return (
    <TreeComponent
      value={tree}
      onSetParent={handleSetParent}
      onRename={handleRename}
      onAddChild={handleAddChild}
      onRemove={handleRemove}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
      <App />
    </DndProvider>
  </React.StrictMode>
)
