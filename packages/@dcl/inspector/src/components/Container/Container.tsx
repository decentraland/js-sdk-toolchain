import React, { useCallback, useState } from 'react'
import cx from 'classnames'
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io'
import { FiAlertTriangle as AlertIcon } from 'react-icons/fi'
import { InfoTooltip } from '../EntityInspector/InfoTooltip'

import { Props } from './types'

import './Container.css'

const Container: React.FC<React.PropsWithChildren<Props>> = (props) => {
  const [open, setOpen] = useState<boolean>(props.initialOpen ?? true)
  const Icon = open ? <IoIosArrowDown className="icon" /> : <IoIosArrowForward className="icon" />

  const renderIndicator = useCallback(() => {
    if (props.indicator) {
      return (
        <span className="indicator">
          {typeof props.indicator === 'boolean' ? (
            <AlertIcon />
          ) : typeof props.indicator === 'string' ? (
            <InfoTooltip text={props.indicator} trigger={<AlertIcon size={16} />} position="top center" />
          ) : (
            props.indicator
          )}
        </span>
      )
    }

    return null
  }, [props.indicator])

  return (
    <div className={cx('Container', props.className, { open })}>
      {props.label && (
        <div className="title" onClick={() => setOpen(!open)}>
          {Icon}
          <span>{props.label}</span>
          {renderIndicator()}
          {props.rightContent && <div className="RightContent">{props.rightContent}</div>}
        </div>
      )}
      {open && <div className="content">{props.children}</div>}
    </div>
  )
}

export default React.memo(Container)
