import React, { useCallback, useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'

import { Input } from '../Input'
import { Controls, Position } from '../Controls'
import { RxDoubleArrowRight as ArrowRight, RxDoubleArrowDown as ArrowDown } from 'react-icons/rx'

import './Tree.css'
import { className } from '@babylonjs/core'

interface ContextMenu<T> {
  value: T
  position: Position
}

interface ContextMenuProps<T> {
  contextMenu?: ContextMenu<T>
  onContextMenuChange: (value?: ContextMenu<T>) => void
}

type Props<T> = {
  value: T
  className?: string
  level?: number
  getId: (value: T) => string
  getChildren: (value: T) => T[]
  getLabel: (value: T) => string | JSX.Element
  isOpen: (value: T) => boolean
  isSelected: (value: T) => boolean
  canRename?: (value: T) => boolean
  canAddChild?: (value: T) => boolean
  canRemove?: (value: T) => boolean
  canToggle?: (value: T) => boolean
  onSetParent: (value: T, parent: T) => void
  onRename: (value: T, label: string) => void
  onAddChild: (value: T, label: string) => void
  onRemove: (value: T) => void
  onToggle: (value: T, isOpen: boolean) => void
  getIcon?: (value: T) => JSX.Element
}

type Tree<T> = Props<T> & ContextMenuProps<T>

const getDefaultLevel = () => 1
const getLevelStyles = (level: number) => ({ paddingLeft: `${level * 10}px` })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })
const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : '' })

function Tree<T>(props: Tree<T>) {
  const {
    className,
    value,
    level = getDefaultLevel(),
    getId,
    getChildren,
    getLabel,
    isOpen,
    isSelected,
    onSetParent,
    canRename,
    canAddChild,
    canRemove,
    canToggle,
    onRename,
    onAddChild,
    onRemove,
    onToggle,
    contextMenu,
    onContextMenuChange
  } = props
  const id = getId(value)
  const label = getLabel(value)
  const open = isOpen(value)
  const selected = isSelected(value)
  const enableRename = canRename ? canRename(value) : true
  const enableAddChild = canAddChild ? canAddChild(value) : true
  const enableRemove = canRemove ? canRemove(value) : true
  const enableToggle = canToggle ? canToggle(value) : true
  const [editMode, setEditMode] = useState(false)
  const [insertMode, setInsertMode] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState<Position | undefined>(undefined)

  const canDrop = useCallback(
    (target: T, source: T): boolean => {
      if (getId(target) === getId(source)) return false
      return getChildren(target).every(($) => canDrop($, source))
    },
    [getId, getChildren]
  )

  const [, drag] = useDrag(() => ({ type: 'tree', item: { value } }), [value])

  const [, drop] = useDrop(
    () => ({
      accept: 'tree',
      drop: ({ value: other }: { value: T }, monitor) => {
        if (monitor.didDrop() || !canDrop(other, value)) return
        onSetParent(other, value)
      }
    }),
    [value, onSetParent, canDrop]
  )

  const quitEditMode = () => setEditMode(false)
  const quitInsertMode = () => setInsertMode(false)

  const handleToggleExpand = (_: React.MouseEvent) => {
    if (enableToggle) {
      onToggle(value, !selected || !open)
    }
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenuChange({ value, position: { x: e.pageX, y: e.pageY } })
  }

  const handleContextMenuCancel = () => onContextMenuChange(undefined)

  const ref = (node: HTMLDivElement | null) => drag(drop(node))

  const controlsProps = {
    active: contextMenu && getId(contextMenu.value) === id,
    enableAdd: enableAddChild,
    enableEdit: enableRename,
    enableRemove,
    onAdd: handleNewChild,
    onCancel: handleContextMenuCancel,
    onEdit: handleToggleEdit,
    onRemove: handleRemove,
    position: contextMenu?.position
  }

  return (
    <div ref={ref} className={`Tree ${className || ''}`} onContextMenu={handleContextMenu}>
      <div style={getLevelStyles(level)} className={selected ? 'item selected' : 'item'}>
        <span onClick={handleToggleExpand} style={getEditModeStyles(editMode)}>
          {props.getIcon ? props.getIcon(value) : open ? <ArrowDown /> : <ArrowRight />}
          {label ? <span>{label || id}</span> : <label />}
        </span>
        {editMode && typeof label === 'string' && (
          <Input value={label || ''} onCancel={quitEditMode} onSubmit={onChangeEditValue} />
        )}
        <Controls {...controlsProps} />
      </div>
      <TreeChildren {...props} />
      {insertMode && <Input value="" onCancel={quitInsertMode} onSubmit={handleAddChild} />}
    </div>
  )
}

function TreeChildren<T>(props: Tree<T>) {
  const { value, level = getDefaultLevel(), getChildren, getId, isOpen } = props
  const children = getChildren(value)
  const open = isOpen(value)

  if (!children.length || !open) return null

  return (
    <div style={getExpandStyles(open)}>
      {children.map(($) => (
        <Tree {...props} value={$} level={level + 1} key={getId($)} />
      ))}
    </div>
  )
}

export default function Main<T>(props: Props<T>) {
  const [activeContextMenu, setActiveContextMenu] = useState<ContextMenu<T> | undefined>(undefined)
  const handleContextMenuChange = (value?: ContextMenu<T>) => setActiveContextMenu(value)

  return <Tree {...props} contextMenu={activeContextMenu} onContextMenuChange={handleContextMenuChange} />
}
