import React, { useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'

import './Tree.css'

import { Input } from './input'
import { Controls } from './controls'

export type Tree = {
  id: string
  label: string
  children: Tree[]
}

interface Props {
  value: Tree
  onSetParent: (id: string, newParentId: string | null) => void
  onRename: (id: string, newLabel: string) => void
  onAddChild: (id: string, label: string) => void
  onRemove: (id: string) => void
}

const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : 'block' })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })

const MemoTree = React.memo(TreeComponent)

const canDrop = (target: Tree, source: Tree): boolean => {
  if (target.id === source.id) return false
  return target.children.every(($) => canDrop($, source))
}

function TreeComponent(props: Props) {
  const { value, onSetParent, onRename, onAddChild, onRemove } = props
  const { children, id, label } = value
  const [expanded, setExpanded] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [insertMode, setInsertMode] = useState(false)

  const [, drag] = useDrag(() => ({ type: 'tree', item: value }), [value])

  const [, drop] = useDrop(
    () => ({
      accept: 'tree',
      drop: (tree: Tree, monitor) => {
        if (monitor.didDrop() || !canDrop(tree, value)) return
        onSetParent(tree.id, id)
      }
    }),
    [value]
  )

  const quitEditMode = () => setEditMode(false)
  const quitInsertMode = () => setInsertMode(false)

  const handleToggleExpand = (_: React.MouseEvent) => {
    setExpanded(!expanded)
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
            {label}{' '}
            <Controls handleEdit={handleToggleEdit} handleNewChild={handleNewChild} handleRemove={handleRemove} />
          </span>
          {editMode && <Input value={label} onCancel={quitEditMode} onSubmit={onChangeEditValue} />}
        </div>
        {!!children.length && (
          <div style={getExpandStyles(expanded)}>
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

export default MemoTree
