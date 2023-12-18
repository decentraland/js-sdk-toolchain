import React from 'react'

import { Warning } from '../Warning'
import { useAppSelector } from '../../../redux/hooks'
import { ErrorType, selectDataLayerError } from '../../../redux/data-layer'

const mapError = {
  [ErrorType.Disconnected]: 'Socket disconnected. Please refresh the page',
  [ErrorType.Reconnecting]: 'Disconnected. Trying to reconnect...',
  [ErrorType.Save]: 'Failed to save. Please try again.',
  [ErrorType.GetPreferences]: 'Failed to get inspector settings.',
  [ErrorType.SetPreferences]: 'Failed to save inspector settings.',
  [ErrorType.GetAssetCatalog]: 'Failed to get assets.',
  [ErrorType.Undo]: 'Undo failed.',
  [ErrorType.Redo]: 'Redo failed.',
  [ErrorType.ImportAsset]: 'Failed to import new asset.',
  [ErrorType.RemoveAsset]: 'Failed to remove asset.',
  [ErrorType.SaveThumbnail]: 'Failed to save thumbnail.',
  [ErrorType.GetThumbnails]: 'Failed to get thumbnails.'
}

const SocketConnection: React.FC = () => {
  const error = useAppSelector(selectDataLayerError)
  if (!error) return null
  return <Warning title={mapError[error]} />
}

export default React.memo(SocketConnection)
