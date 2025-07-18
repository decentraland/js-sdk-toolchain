import React, { useCallback, useMemo, useRef, useState } from 'react'
import { XYCoord, useDrag, useDrop } from 'react-dnd'
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io'
import cx from 'classnames'
import { Entity } from '@dcl/ecs'
import { FiAlertTriangle as WarningIcon } from 'react-icons/fi'

import { withContextMenu } from '../../hoc/withContextMenu'
import { Input } from '../Input'
import { ContextMenu } from './ContextMenu'
import { ActionArea } from './ActionArea'
import { Edit as EditInput } from './Edit'
import { DropType, calculateDropType } from './utils'
import { useSdk } from '../../hooks/sdk/useSdk'
import { ROOT, PLAYER, CAMERA } from '../../lib/sdk/tree'
import { useAppSelector } from '../../redux/hooks'
import { getEntitiesOutOfBoundaries } from '../../redux/scene-metrics'

import './Tree.css'

type Props<T> = {
  value: T
  className?: string
  getExtraContextMenu?: (value: T) => JSX.Element | null
  level?: number
  getId: (value: T) => string
  getChildren: (value: T) => T[]
  getIcon?: (value: T) => JSX.Element
  getLabel: (value: T) => string | JSX.Element
  getSelectedItems?: () => T[]
  isOpen: (value: T) => boolean
  isSelected: (value: T) => boolean
  isHidden: (value: T) => boolean
  canRename?: (value: T) => boolean
  canAddChild?: (value: T) => boolean
  canRemove?: (value: T) => boolean
  canDuplicate?: (value: T) => boolean
  canDrag?: (value: T) => boolean
  canReorder?: (source: T, target: T, type: DropType) => boolean
  onSetOpen: (value: T, isOpen: boolean) => void
  onSelect: (value: T, clickType?: 'single' | 'ctrl' | 'shift') => void
  onDoubleSelect?: (value: T) => void
  onDrop: (source: T, target: T, dropType: DropType) => void
  onRename: (value: T, label: string) => void
  onAddChild: (value: T, label: string) => void
  onRemove: (value: T) => void
  onDuplicate: (value: T) => void
  getDragContext?: () => unknown
  dndType?: string
  onLastSelectedChange?: (value: T) => void
}

type EmptyString = ''

const getDefaultLevel = () => 0
const getLevelStyles = (level: number) => ({ paddingLeft: `${level * 10}px` })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })
const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : '' })

export function Tree<T>() {
  return React.memo(
    withContextMenu<Props<T>>((props) => {
      const {
        getExtraContextMenu,
        className,
        contextMenuId,
        value,
        level = getDefaultLevel(),
        getId,
        getChildren,
        getLabel,
        getSelectedItems,
        isOpen,
        isSelected,
        onSelect,
        isHidden,
        onDrop,
        canRename,
        canAddChild,
        canRemove,
        canDuplicate,
        canDrag,
        canReorder,
        onRename,
        onAddChild,
        onRemove,
        onDuplicate,
        onDoubleSelect,
        onSetOpen,
        getDragContext = () => ({}),
        dndType = 'tree',
        onLastSelectedChange
      } = props
      const ref = useRef<HTMLDivElement>(null)
      const id = getId(value)
      const label = getLabel(value)
      const open = isOpen(value)
      const selected = isSelected(value)
      const hidden = isHidden(value)
      const enableRename = canRename ? canRename(value) : true
      const enableAddChild = canAddChild ? canAddChild(value) : true
      const enableRemove = canRemove ? canRemove(value) : true
      const enableOpen = getChildren(value).length > 0
      const enableDuplicate = canDuplicate ? canDuplicate(value) : true
      const enableDrag = canDrag ? canDrag(value) : true
      const extraContextMenu = getExtraContextMenu ? getExtraContextMenu(value) : null
      const [editMode, setEditMode] = useState(false)
      const [insertMode, setInsertMode] = useState(false)
      const [dropType, setDropType] = useState<DropType | EmptyString>('')
      // we need this ref just for the e2e tests to work since it's caching "dropType" value for some reason...
      const dropTypeRef = useRef<DropType | EmptyString>('')
      const canDrop = useCallback(
        (target: T, source: T): boolean => {
          if (getId(target) === getId(source)) return false
          return getChildren(target).every(($) => canDrop($, source))
        },
        [getId, getChildren]
      )

      const canDropMultiple = useCallback(
        (target: T, sources: T[]): boolean => {
          if (sources.some((source) => getId(target) === getId(source))) return false
          if (sources.some((source) => isDescendantOf(target, source))) return false
          return getChildren(target).every(($) => canDropMultiple($, sources))
        },
        [getId, getChildren]
      )

      const isDescendantOf = useCallback(
        (ancestor: T, descendant: T): boolean => {
          const children = getChildren(ancestor)
          if (children.some((child) => getId(child) === getId(descendant))) return true
          return children.some((child) => isDescendantOf(child, descendant))
        },
        [getId, getChildren]
      )

      const [{ isHover }, drop] = useDrop(
        () => ({
          accept: dndType,
          drop: (item: { items: T[]; context: unknown }, monitor) => {
            const dropTypeValue = dropType || dropTypeRef.current
            if (monitor.didDrop() || !dropTypeValue) return

            const { items } = item
            const isMultipleDrag = items.length > 1

            if (isMultipleDrag) {
              if (!canDropMultiple(value, items)) return
              items.forEach((sourceItem) => onDrop(sourceItem, value, dropTypeValue))
            } else {
              const sourceItem = items[0]
              if (!canDrop(sourceItem, value)) return
              onDrop(sourceItem, value, dropTypeValue)
            }
          },
          hover: (item: { items: T[]; context: unknown }, monitor) => {
            if (!ref.current) {
              dropTypeRef.current = ''
              return setDropType('')
            }

            const { items } = item

            // check if hovering over one of the dragged items
            if (items.some((sourceItem) => getId(sourceItem) === getId(value))) {
              dropTypeRef.current = ''
              return setDropType('')
            }

            const coords = monitor.getClientOffset() as XYCoord
            const rect = ref.current.getBoundingClientRect()
            const dropType = calculateDropType(coords.y, rect)

            const enableReorder = canReorder
              ? items.every((sourceItem) => canReorder(sourceItem, value, dropType))
              : true

            const newDropTypeValue = enableReorder ? dropType : ''

            setDropType(newDropTypeValue)
            dropTypeRef.current = newDropTypeValue
          },
          collect: (monitor) => ({
            isHover: monitor.isOver({ shallow: true })
          })
        }),
        [value, dropType, onDrop, canDrop, canDropMultiple, canReorder, getId]
      )

      const quitEditMode = () => setEditMode(false)
      const quitInsertMode = () => setInsertMode(false)

      const handleClick = (event: React.MouseEvent) => {
        const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.userAgent)
        const isCtrlClick = isMac ? event.metaKey : event.ctrlKey
        const isShiftClick = event.shiftKey
        const isDoubleClick = event.detail > 1 && onDoubleSelect
        const clickType = isCtrlClick ? 'ctrl' : isShiftClick ? 'shift' : 'single'

        if (clickType === 'single' && onLastSelectedChange) {
          onLastSelectedChange(value)
        }

        onSelect(value, clickType)
        if (isDoubleClick) onDoubleSelect(value)
      }

      const handleOpen = (_: React.MouseEvent) => {
        onSetOpen(value, !open)
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
        onSetOpen(value, true)
      }

      const sdk = useSdk()
      const entitiesOutOfBoundaries = useAppSelector(getEntitiesOutOfBoundaries)

      const [, drag] = useDrag(
        () => ({
          type: dndType,
          canDrag: enableDrag,
          item: () => {
            const selectedItems = getSelectedItems ? getSelectedItems() : []
            // if this item is selected and there are multiple selections, drag all selected items
            if (selectedItems.length > 1 && selectedItems.some((item) => getId(item) === getId(value))) {
              return {
                items: selectedItems,
                context: getDragContext()
              }
            }
            return {
              items: [value],
              context: getDragContext()
            }
          }
        }),
        [value, getSelectedItems, getId]
      )

      const handleRemove = () => {
        if (isEntity && sdk) {
          const selectedEntities = sdk.operations.getSelectedEntities()
          if (selectedEntities.length > 1) {
            selectedEntities.forEach((entity) => {
              if (typeof entity === typeof value) {
                onRemove(entity as T)
              }
            })
          } else {
            onRemove(value)
          }
        } else {
          onRemove(value)
        }
      }

      const handleDuplicate = () => {
        if (isEntity && sdk) {
          const selectedEntities = sdk.operations.getSelectedEntities()
          if (selectedEntities.length > 1) {
            selectedEntities.forEach((entity) => {
              if (typeof entity === typeof value) {
                onDuplicate(entity as T)
              }
            })
          } else {
            onDuplicate(value)
          }
        } else {
          onDuplicate(value)
        }
      }

      const isValidEntity = useMemo(() => {
        return typeof value !== 'string'
      }, [value])

      const isEntity = useMemo(() => {
        if (typeof value === 'string') return false
        return value !== ROOT && value !== PLAYER && value !== CAMERA
      }, [value])

      const isEntityOutOfBoundaries = useMemo(() => {
        if (typeof value === 'string') return false
        return entitiesOutOfBoundaries.includes(value as Entity)
      }, [value, entitiesOutOfBoundaries])

      drag(drop(ref))

      const controlsProps = {
        id: contextMenuId,
        enableAdd: enableAddChild,
        enableEdit: (enableRename && (!isEntity || (sdk && sdk.operations.getSelectedEntities().length < 2))) || false,
        enableRemove,
        enableDuplicate,
        onAddChild: handleNewChild,
        onEdit: handleToggleEdit,
        onRemove: handleRemove,
        onDuplicate: handleDuplicate,
        extra: extraContextMenu
      }

      const children = getChildren(value)
      const treeClassNames = cx('Tree', className, {
        'is-parent': children.length,
        [dropType]: isHover && dropType
      })

      return (
        <div className={treeClassNames} data-test-id={id} data-test-label={label}>
          <div style={getLevelStyles(level)} className={cx({ selected, item: true, hidden })}>
            <ContextMenu {...controlsProps} />
            <div ref={ref} style={getEditModeStyles(editMode)} className="item-area">
              <DisclosureWidget enabled={enableOpen} isOpen={open} onOpen={handleOpen} />
              <div onClick={handleClick} className="selectable-area">
                {props.getIcon && props.getIcon(value)}
                <div>{label || id}</div>
                {isValidEntity && <ActionArea entity={value as Entity} />}
                {isEntity && isEntityOutOfBoundaries && <WarningIcon className="WarningIcon" />}
              </div>
            </div>
            {editMode && typeof label === 'string' && (
              <EditInput value={label} onCancel={quitEditMode} onSubmit={onChangeEditValue} />
            )}
          </div>
          <TreeChildren {...props} />
          {insertMode && <Input value="" onCancel={quitInsertMode} onSubmit={handleAddChild} onBlur={quitInsertMode} />}
        </div>
      )
    })
  )
}

interface DisclosureWidgetProps {
  enabled: boolean
  isOpen: boolean
  onOpen: (e: React.MouseEvent) => void
}

// fun naming? https://en.wikipedia.org/wiki/Disclosure_widget
function DisclosureWidget({ enabled, isOpen, onOpen }: DisclosureWidgetProps) {
  if (!enabled) {
    return <span style={{ marginLeft: '12px' }}></span>
  }
  const Arrow = isOpen ? IoIosArrowDown : IoIosArrowForward
  return <Arrow onClick={onOpen} />
}

function TreeChildren<T>(props: Props<T>) {
  const CompTree = Tree<T>()
  const { value, level = getDefaultLevel(), getChildren, getId, isOpen, isHidden } = props
  const children = getChildren(value)
  const open = isOpen(value)
  const hidden = isHidden(value)
  const levelProp = hidden ? level : level + 1

  if (!children.length || !open) return null

  return (
    <div style={getExpandStyles(open)}>
      {children.map(($) => (
        <CompTree {...props} value={$} level={levelProp} key={getId($)} />
      ))}
    </div>
  )
}

export default Tree
