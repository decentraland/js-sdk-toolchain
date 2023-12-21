import React, { useCallback } from 'react'
import cx from 'classnames'
import Pill from '../../Pill/Pill'
import { Props as Option } from '../Option/types'
import { Props } from './types'
import './MultipleOption.css'

const MultipleOption: React.FC<Props> = ({ className, minWidth, value, onRemove }) => {
  const handleRemoveOption = useCallback(
    (e: React.MouseEvent<SVGElement, MouseEvent>, value: Option) => {
      e.preventDefault()
      e.stopPropagation()
      onRemove && onRemove(e, value)
    },
    [onRemove]
  )

  return (
    <div className={cx('MultipleOptionContainer', className)} style={{ minWidth: minWidth }}>
      {value?.map((option, idx) => (
        <Pill
          key={`action-${value}-${idx}`}
          content={option.label ?? option.value}
          onRemove={(e) => handleRemoveOption(e, option)}
        />
      ))}
    </div>
  )
}

export default React.memo(MultipleOption)
