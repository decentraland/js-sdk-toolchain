import React, { useCallback } from 'react'
import cx from 'classnames'
import { IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'
import { VscQuestion as QuestionIcon } from 'react-icons/vsc'
import { AiOutlineInfoCircle as InfoIcon } from 'react-icons/ai'
import { FiAlertTriangle as WarningIcon } from 'react-icons/fi'

import { type Props, MessageType } from './types'

import './Message.css'

const Message: React.FC<Props> = ({ className, text, type = MessageType.INFO, icon = true }) => {
  if (!text || typeof text === 'boolean') {
    return null
  }

  const renderIcon = useCallback(() => {
    switch (type) {
      case MessageType.ERROR:
        return <AlertIcon className="Icon" size={16} />
      case MessageType.WARNING:
        return <WarningIcon className="Icon" size={16} />
      case MessageType.QUESTION:
        return <QuestionIcon className="Icon" size={16} />
      case MessageType.INFO:
      default:
        return <InfoIcon className="Icon" size={16} />
    }
  }, [type])

  return (
    <p className={cx('Message', className, type)}>
      {icon && renderIcon()}
      <span>{text}</span>
    </p>
  )
}

export default React.memo(Message)
