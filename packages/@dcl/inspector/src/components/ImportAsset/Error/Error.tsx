import { useCallback } from 'react'

import { InfoTooltip } from '../../ui'
import { formatFileName } from '../utils'

import { PropTypes } from './types'

import './Error.css'
import { ValidationError } from '../types'

import cx from 'classnames'
import { Button } from '../../Button'

export function Error({ assets, errorMessage, primaryAction, secondaryAction }: PropTypes) {
  const getErrorMessage = useCallback((error: ValidationError): string => {
    switch (error?.type) {
      case 'type':
        return 'File type not supported'
      case 'model':
        return 'The model has some issues'
      case 'size':
        return 'File size is too large'
      default:
        return ''
    }
  }, [])

  return (
    <div className="ImportError">
      <div className="alert-icon"></div>
      <h3>{errorMessage}</h3>
      <div className="errors">
        {assets.map(($, i) => $.error && <ErrorMessage key={i} asset={$} message={getErrorMessage($.error)} />)}
      </div>
      <div
        className={cx('actions-container', {
          'space-between': !!secondaryAction
        })}
      >
        {!!secondaryAction && (
          <Button onClick={secondaryAction.onClick} size="big">
            {secondaryAction.name}
          </Button>
        )}
        <Button onClick={primaryAction.onClick} type="danger" size="big">
          {primaryAction.name}
        </Button>
      </div>
    </div>
  )
}

function ErrorMessage({ asset, message }: { asset: PropTypes['assets'][0]; message: string }) {
  const errorMessage = asset.error?.message
  return (
    <span>
      {formatFileName(asset)}
      {message && ` - ${message}`}
      {errorMessage && <InfoTooltip text={errorMessage} type="help" />}
    </span>
  )
}
