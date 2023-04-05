import React, { useCallback, useEffect } from 'react'
import { MdOutlineDriveFileRenameOutline } from 'react-icons/md'
import { AiFillFileAdd, AiFillDelete } from 'react-icons/ai'

import './Controls.css'

export interface Position {
  x: number
  y: number
}

interface ControlsProps {
  active?: boolean
  position?: Position
  enableAdd?: boolean
  enableEdit?: boolean
  enableRemove?: boolean
  onCancel: () => void
  onEdit: (e: React.MouseEvent) => void
  onAdd: (e: React.MouseEvent) => void
  onRemove: (e: React.MouseEvent) => void
}

const cancelingKeys = new Set(['Escape', 'Tab'])

const getActiveClass = (active: boolean) => (active ? 'active' : '')

const Controls = ({
  active = false,
  position = { x: 0, y: 0 },
  enableAdd = true,
  enableEdit = true,
  enableRemove = true,
  onCancel,
  onEdit,
  onAdd,
  onRemove
}: ControlsProps) => {
  const handleCancel = useCallback((e: Event | React.MouseEvent) => {
    e.stopPropagation()
    onCancel()
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (cancelingKeys.has(e.key)) handleCancel(e)
  }, [])

  useEffect(() => {
    if (active) {
      document.body.addEventListener('click', handleCancel)
      document.body.addEventListener('keyup', handleKeyUp)
    }

    return () => {
      document.body.removeEventListener('click', handleCancel)
      document.body.removeEventListener('keyup', handleKeyUp)
    }
  }, [active])

  const handleAction = useCallback(
    (cb: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
      cb(e)
      handleCancel(e)
    },
    []
  )

  const someActionIsEnabled = enableAdd || enableEdit || enableRemove
  const shouldRender = someActionIsEnabled && active

  if (!shouldRender) return null

  return (
    <div className={`Controls ${getActiveClass(active)}`} style={{ top: position.y, left: position.x }}>
      {enableEdit && (
        <button onClick={handleAction(onEdit)}>
          <MdOutlineDriveFileRenameOutline /> Rename
        </button>
      )}
      {enableAdd && (
        <button onClick={handleAction(onAdd)}>
          <AiFillFileAdd /> Add child
        </button>
      )}
      {enableRemove && (
        <button onClick={handleAction(onRemove)}>
          <AiFillDelete /> Delete
        </button>
      )}
    </div>
  )
}

export default React.memo(Controls)
