import React from 'react'
import cx from 'classnames'
import { IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'

import type { Props } from './types'

import './ErrorMessage.css'

const ErrorMessage: React.FC<Props> = ({ className, error }) => {
  if (!error || typeof error !== 'string') {
    return null
  }

  return (
    <p className={cx('ErrorMessage', className)}>
      <AlertIcon />
      <span>{error}</span>
    </p>
  )
}

export default React.memo(ErrorMessage)
