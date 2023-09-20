import React, { useCallback, useState } from 'react'
import { VscEllipsis as EllipsisIcon } from 'react-icons/vsc'
import { Button } from '../../Button'
import { useOutsideClick } from '../../../hooks/useOutsideClick'

import './MoreOptionsMenu.css'

export const MoreOptionsMenu = ({ children, icon }: { children: JSX.Element | JSX.Element[]; icon?: JSX.Element }) => {
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false)

  const handleShowMoreOptions = useCallback(
    (_e: React.MouseEvent<HTMLButtonElement>) => {
      setShowMoreOptions(!showMoreOptions)
    },
    [showMoreOptions, setShowMoreOptions]
  )

  const handleClosePanel = useCallback(() => {
    setShowMoreOptions(false)
  }, [setShowMoreOptions])

  const ref = useOutsideClick(handleClosePanel)

  return (
    <div className="MoreOptionsMenu" ref={ref}>
      <Button className="MoreOptionsButton" onClick={handleShowMoreOptions}>
        {icon ?? <EllipsisIcon size={16} />}
      </Button>
      {showMoreOptions && (
        <div className="MoreOptionsContent" onClick={handleClosePanel}>
          {children}
        </div>
      )}
    </div>
  )
}

export default React.memo(MoreOptionsMenu)
