import React, { useCallback, useEffect, useState } from 'react'
import { MdOutlineDriveFileRenameOutline } from 'react-icons/md'
import { AiFillFileAdd, AiFillDelete } from 'react-icons/ai'
import { RxListBullet } from 'react-icons/rx'

import './Controls.css'

interface ControlsProps {
  enableAdd?: boolean
  enableEdit?: boolean
  enableRemove?: boolean
  handleEdit: (e: React.MouseEvent) => void
  handleAdd: (e: React.MouseEvent) => void
  handleRemove: (e: React.MouseEvent) => void
}

const cancelingKeys = new Set(['Escape', 'Tab'])

const getActiveClass = (active: boolean) => (active ? 'active' : '')

const Controls = ({
  enableAdd = true,
  enableEdit = true,
  enableRemove = true,
  handleEdit,
  handleAdd,
  handleRemove
}: ControlsProps) => {
  const [active, setActive] = useState(false)

  const onCancel = useCallback((e: Event) => {
    e.stopPropagation()
    setActive(false)
  }, [])

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (cancelingKeys.has(e.key)) onCancel(e)
  }, [])

  useEffect(() => {
    if (active) {
      document.body.addEventListener('click', onCancel)
      document.body.addEventListener('keyup', onKeyUp)
    }

    return () => {
      document.body.removeEventListener('click', onCancel)
      document.body.removeEventListener('keyup', onKeyUp)
    }
  }, [active])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setActive(!active)
  }, [])

  const handleAction = useCallback(
    (cb: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
      setActive(false)
      cb(e)
    },
    []
  )

  const someActionIsEnabled = enableAdd || enableEdit || enableRemove
  const shouldRenderActions = someActionIsEnabled && active

  return (
    <div className={`Controls ${getActiveClass(active)}`}>
      {someActionIsEnabled && (
        <div onClick={handleClick} className="bullets">
          <RxListBullet />
        </div>
      )}
      {shouldRenderActions && (
        <div className="actions">
          {enableEdit && (
            <button onClick={handleAction(handleEdit)}>
              <MdOutlineDriveFileRenameOutline /> Rename
            </button>
          )}
          {enableAdd && (
            <button onClick={handleAction(handleAdd)}>
              <AiFillFileAdd /> Add child
            </button>
          )}
          {enableRemove && (
            <button onClick={handleAction(handleRemove)}>
              <AiFillDelete /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default React.memo(Controls)
