import React from 'react'

import { useAppSelector } from '../../../redux/hooks'
import { ErrorType, selectSdkOperationError } from '../../../redux/sdk'
import { Warning } from '../Warning'

const mapError = {
  [ErrorType.AncestorSelected]: "You can't select an ancestor of an already selected entity"
}

const SdkOperation: React.FC = () => {
  const error = useAppSelector(selectSdkOperationError)
  if (!error) return null
  return <Warning title={mapError[error]} />
}

export default React.memo(SdkOperation)
