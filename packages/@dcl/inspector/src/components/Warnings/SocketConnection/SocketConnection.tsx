import React from 'react'

import { Warning } from '../Warning'
import { useAppSelector } from '../../../redux/hooks'
import { ErrorType, getError } from '../../../redux/data-layer'

const mapError = {
  [ErrorType.Disconnected]: 'Socket disconnected. Please refresh the page',
  [ErrorType.Reconnecting]: 'Disconnected. Trying to reconnect...'
}

const SocketConnection: React.FC = () => {
  const error = useAppSelector(getError)
  if (!error) return null
  return <Warning title={mapError[error]} />
}

export default React.memo(SocketConnection)
