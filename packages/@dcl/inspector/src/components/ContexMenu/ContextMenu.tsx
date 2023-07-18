import React, { useCallback, useEffect, useState } from 'react'
import { Menu } from 'react-contexify'
import { contextMenu } from 'react-contexify'

export type Props = React.PropsWithChildren<{
  id: string
}>

export function ContextMenu({ id, children }: Props) {
  const [isVisible, setIsVisible] = useState(false)

  const trackVisibility = useCallback(
    (isVisible: boolean) => {
      setIsVisible(isVisible)
    },
    [isVisible]
  )

  const hideOnOutsideMouseDown = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (isVisible && !target.classList.value.includes('contexify')) {
        contextMenu.hideAll()
      }
    },
    [isVisible]
  )

  useEffect(() => {
    document.addEventListener('mousedown', hideOnOutsideMouseDown)
    return () => {
      document.removeEventListener('mousedown', hideOnOutsideMouseDown)
    }
  })

  if (!children) return null

  return (
    <Menu id={id} onVisibilityChange={trackVisibility} animation={{ enter: 'fade', exit: false }}>
      {children}
    </Menu>
  )
}

export default React.memo(ContextMenu)
