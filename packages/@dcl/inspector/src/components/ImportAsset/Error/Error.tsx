import { useCallback } from 'react'

import { InfoTooltip } from '../../ui'
import { formatFileName } from '../utils'
import { Button } from '../../Button'

import { PropTypes } from './types'

import './Error.css'
import { ValidationError } from '../types'

export function Error({ assets, onSubmit }: PropTypes) {
  const getErrorMessage = useCallback((error: ValidationError): string => {
    if (!error) return 'Unknown error'

    switch (error.type) {
      case 'type':
        return 'File type not supported'
      case 'model':
        return 'The model has some issues'
      case 'size':
        return 'File size is too large'
      default:
        return 'Unknown error'
    }
  }, [])

  return (
    <div className="ImportError">
      <div className="alert-icon"></div>
      <h2>Asset failed to import</h2>
      <div className="errors">
        {assets.map(($, i) => (
          <ErrorMessage key={i} asset={$} message={getErrorMessage($.error)} />
        ))}
      </div>
      <Button type="danger" size="big" onClick={onSubmit}>
        OK
      </Button>
    </div>
  )
}

function ErrorMessage({ asset, message }: { asset: PropTypes['assets'][0]; message: string }) {
  const errorMessage = asset.error?.message
  return (
    <span>
      {formatFileName(asset)} - {message} {errorMessage && <InfoTooltip text={errorMessage} type="help" />}
    </span>
  )
}
