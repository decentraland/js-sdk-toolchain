import { contextMenu } from 'react-contexify'
import 'react-contexify/dist/ReactContexify.css'
import { analytics, Event } from '../../../lib/logic/analytics'

export const CUSTOM_ASSETS_CONTEXT_MENU_ID = 'custom-assets-context-menu'

export type CustomAssetContextMenuProps = {
  assetId: string
  onDelete: (assetId: string) => void
  onRename: (assetId: string) => void
}

export function openCustomAssetContextMenu(event: React.MouseEvent, props: CustomAssetContextMenuProps) {
  event.preventDefault()
  contextMenu.show({
    id: CUSTOM_ASSETS_CONTEXT_MENU_ID,
    event,
    props: {
      ...props,
      onDelete: (assetId: string) => {
        analytics.track(Event.DELETE_CUSTOM_ITEM, {
          itemId: assetId
        })
        props.onDelete(assetId)
      },
      onRename: (assetId: string) => {
        analytics.track(Event.RENAME_CUSTOM_ITEM, {
          itemId: assetId
        })
        props.onRename(assetId)
      }
    }
  })
}
