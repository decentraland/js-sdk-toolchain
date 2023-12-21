import React from 'react'
import cx from 'classnames'
import { IoIosClose as CloseIcon } from 'react-icons/io'

import { Props } from './types'

import './Pill.css'

const Pill: React.FC<Props> = ({ className, content, onClick, onRemove }) => {
  return (
    <div className={cx('Pill', className)} onClick={onClick}>
      <div className="Content">{content}</div>
      {onRemove ? <CloseIcon className="CloseIcon" onClick={onRemove} /> : null}
    </div>
  )
}

export default React.memo(Pill)
