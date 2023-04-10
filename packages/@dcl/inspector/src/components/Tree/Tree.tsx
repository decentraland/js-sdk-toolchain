import React, { useCallback, useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { RxDoubleArrowRight as ArrowRight, RxDoubleArrowDown as ArrowDown } from 'react-icons/rx'

import { Input } from '../Input'
import { ContextMenu } from './ContextMenu'

import './Tree.css'
import { withContextMenu } from '../../hoc/withContextMenu'
import { Entity } from '@dcl/ecs'

type Props<T> = {
  value: T
  level?: number
  getId: (value: T) => string
  getChildren: (value: T) => T[]
  getEntityComponents: (value: T, missing?: boolean) => Map<number, string>
  getLabel: (value: T) => string
  isOpen: (value: T) => boolean
  isSelected: (value: T) => boolean
  canRename?: (value: T) => boolean
  canAddChild?: (value: T) => boolean
  canRemove?: (value: T) => boolean
  canToggle?: (value: T) => boolean
  onSetParent: (value: T, parent: T) => void
  onRename: (value: T, label: string) => void
  onAddComponent: (value: T, componentId: number) => void
  onAddChild: (value: T, label: string) => void
  onRemove: (value: T) => void
  onToggle: (value: T, isOpen: boolean) => void
}

const getDefaultLevel = () => 1
const getLevelStyles = (level: number) => ({ paddingLeft: `${level * 10}px` })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })
const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : '' })

function Tree<T>(_props: Props<T>) {
  const Component = withContextMenu<Props<T>>((props) => {
    const {
      contextMenuId,
      value,
      level = getDefaultLevel(),
      getId,
      getChildren,
      getEntityComponents,
      getLabel,
      isOpen,
      isSelected,
      onSetParent,
      canRename,
      canAddChild,
      canRemove,
      canToggle,
      onRename,
      onAddComponent,
      onAddChild,
      onRemove,
      onToggle,
    } = props
    const id = getId(value)
    const label = getLabel(value)
    const components = getEntityComponents(value, true)
    const open = isOpen(value)
    const selected = isSelected(value)
    const enableRename = canRename ? canRename(value) : true
    const enableAddChild = canAddChild ? canAddChild(value) : true
    const enableRemove = canRemove ? canRemove(value) : true
    const enableToggle = canToggle ? canToggle(value) : true
    const [editMode, setEditMode] = useState(false)
    const [insertMode, setInsertMode] = useState(false)

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

    const handleToggleEdit = () => {
      setEditMode(true)
    }

    const onChangeEditValue = (newValue: string) => {
      onRename(value, newValue)
      setEditMode(false)
    }

    const handleNewChild = () => {
      setInsertMode(true)
    }

    const handleAddChild = (childLabel: string) => {
      if (!insertMode) return
      onAddChild(value, childLabel)
      quitInsertMode()
      onToggle(value, true)
    }

    const handleRemove = () => {
      onRemove(value)
    }

    const ref = (node: HTMLDivElement | null) => drag(drop(node))

    const handleAddComponent = (id: string) => {
      onAddComponent(value, Number(id))
    }

    const controlsProps = {
      id: contextMenuId,
      components,
      enableAdd: enableAddChild,
      enableEdit: enableRename,
      enableRemove,
      onAddComponent: handleAddComponent,
      onAddChild: handleNewChild,
      onEdit: handleToggleEdit,
      onRemove: handleRemove,
    }

    return (
      <div ref={ref} className="Tree">
        <div style={getLevelStyles(level)} className={selected ? 'selected' : ''}>
          <ContextMenu {...controlsProps} />
          <span onClick={handleToggleExpand} style={getEditModeStyles(editMode)}>
            {open ? <ArrowDown /> : <ArrowRight />}
            <span>{label || id}</span>
          </span>
          {editMode && <Input value={label || ''} onCancel={quitEditMode} onSubmit={onChangeEditValue} />}
        </div>
        <TreeChildren {...props} />
        {insertMode && <Input value="" onCancel={quitInsertMode} onSubmit={handleAddChild} />}
      </div>
    )
  })
  return <Component {..._props} />
}

function TreeChildren<T>(props: Props<T>) {
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

export default Tree
