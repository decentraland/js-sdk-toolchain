import React, { useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'

import { Input } from '../Input'
import { Controls } from '../Controls'

import './Tree.css'

export type Props<T> = {
  value: T
  getId: (value: T) => string
  getChildren: (value: T) => T[]
  getLabel: (value: T) => string
  isOpen: (value: T) => boolean
  isSelected: (value: T) => boolean
  onSetParent: (value: T, parent: T) => void
  onRename: (value: T, label: string) => void
  onAddChild: (value: T, label: string) => void
  onRemove: (value: T) => void
  onToggle: (value: T, isOpen: boolean) => void
}

const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : 'block' })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })

function Tree<T>(props: Props<T>) {
  const {
    value,
    getId,
    getChildren,
    getLabel,
    isOpen,
    isSelected,
    onSetParent,
    onRename,
    onAddChild,
    onRemove,
    onToggle
  } = props
  const id = getId(value)
  const children = getChildren(value)
  const label = getLabel(value)
  const open = isOpen(value)
  const selected = isSelected(value)
  const [editMode, setEditMode] = useState(false)
  const [insertMode, setInsertMode] = useState(false)

  const canDrop = (target: T, source: T): boolean => {
    if (getId(target) === getId(source)) return false
    return getChildren(target).every(($) => canDrop($, source))
  }

  const [, drag] = useDrag(() => ({ type: 'tree', item: { entity: value } }), [value])

  const [, drop] = useDrop(
    () => ({
      accept: 'tree',
      drop: ({ entity }: { entity: T }, monitor) => {
        if (monitor.didDrop() || !canDrop(entity, value)) return
        onSetParent(entity, value)
      }
    }),
    [value]
  )

  const quitEditMode = () => setEditMode(false)
  const quitInsertMode = () => setInsertMode(false)

  const handleToggleExpand = (_: React.MouseEvent) => {
    onToggle(value, !selected || !open)
  }

  const handleToggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditMode(true)
  }

  const onChangeEditValue = (newValue: string) => {
    onRename(value, newValue)
    setEditMode(false)
  }

  const handleNewChild = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInsertMode(true)
  }

  const handleAddChild = (childLabel: string) => {
    if (!insertMode) return
    onAddChild(value, childLabel)
    quitInsertMode()
    onToggle(value, true)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(value)
  }

  return (
    <ul ref={(node) => drag(drop(node))}>
      <li>
        <div>
          <span onClick={handleToggleExpand} style={getEditModeStyles(editMode)}>
            {selected ? '[ST]' : ''}
            {label || id}{' '}
            <Controls handleEdit={handleToggleEdit} handleNewChild={handleNewChild} handleRemove={handleRemove} />
          </span>
          {editMode && <Input value={label || ''} onCancel={quitEditMode} onSubmit={onChangeEditValue} />}
        </div>
        {!!children.length && open && (
          <div style={getExpandStyles(open)}>
            {children.map(($) => (
              <MemoTree {...props} value={$} key={getId($)} />
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
