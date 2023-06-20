import { useId } from 'react'
import { useContextMenu } from 'react-contexify'

export type ContextMenuProps<T> = T & { contextMenuId: string }

/**
 * This can be used to wrap a component with a higher order component that will initialize a Context Menu
 * @param Component
 * @returns
 */
export function withContextMenu<P extends object>(
  Component: React.ComponentType<ContextMenuProps<P>>
): React.FC<Omit<P, 'contextMenuId'>> {
  return ({ ...props }) => {
    const id = useId()
    const { show } = useContextMenu({ id: id })
    const handleShow = (e: React.MouseEvent) => {
      // both (prenventDefault and stopPropagation) are needed to avoid showing the default
      // context menu on browsers/vscode & stop event propagation...
      e.preventDefault()
      e.stopPropagation()
      show({ event: e })
    }

    return (
      <div onContextMenu={handleShow} className="with-context-menu">
        <Component {...(props as P)} contextMenuId={id} />
      </div>
    )
  }
}
