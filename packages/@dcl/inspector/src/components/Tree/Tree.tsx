import React, { useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'

import { Input } from './input'
import { Controls } from './controls'

import './Tree.css'

export type Node = {
  id: string
  children: Node[]
  label?: string
  open?: boolean
}

export type Props = {
  value: Node
  onSetParent: (id: string, newParentId: string | null) => void
  onRename: (id: string, newLabel: string) => void
  onAddChild: (id: string, label: string) => void
  onRemove: (id: string) => void
  onToggle: (id: string, value: boolean) => void
}

const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : 'block' })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })

const canDrop = (target: Node, source: Node): boolean => {
  if (target.id === source.id) return false
  return target.children.every(($) => canDrop($, source))
}

const Tree: React.FC<Props> = (props) => {
  const { value, onSetParent, onRename, onAddChild, onRemove, onToggle } = props
  const { children, id, label, open } = value
  const [editMode, setEditMode] = useState(false)
  const [insertMode, setInsertMode] = useState(false)

  const [, drag] = useDrag(() => ({ type: 'tree', item: value }), [value])

  const [, drop] = useDrop(
    () => ({
      accept: 'tree',
      drop: (tree: Node, monitor) => {
        if (monitor.didDrop() || !canDrop(tree, value)) return
        onSetParent(tree.id, id)
      }
    }),
    [value]
  )

  const quitEditMode = () => setEditMode(false)
  const quitInsertMode = () => setInsertMode(false)

  const handleToggleExpand = (_: React.MouseEvent) => {
    onToggle(id, !open)
  }

  const handleToggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditMode(true)
  }

  const onChangeEditValue = (newValue: string) => {
    onRename(id, newValue)
    setEditMode(false)
  }

  const handleNewChild = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInsertMode(true)
  }

  const handleAddChild = (childLabel: string) => {
    if (!insertMode) return
    onAddChild(id, childLabel)
    quitInsertMode()
    onToggle(id, true)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(id)
  }

  return (
    <ul ref={(node) => drag(drop(node))}>
      <li>
        <div>
          <span onClick={handleToggleExpand} style={getEditModeStyles(editMode)}>
            {label || id}{' '}
            <Controls handleEdit={handleToggleEdit} handleNewChild={handleNewChild} handleRemove={handleRemove} />
          </span>
          {editMode && <Input value={label || ''} onCancel={quitEditMode} onSubmit={onChangeEditValue} />}
        </div>
        {!!children.length && open && (
          <div style={getExpandStyles(open)}>
            {children.map(($) => (
              <MemoTree {...props} value={$} key={$.id} />
            ))}
          </div>
        )}
        {insertMode && <Input value="" onCancel={quitInsertMode} onSubmit={handleAddChild} />}
      </li>
    </ul>
  )
}

const MemoTree = Tree

export default MemoTree
