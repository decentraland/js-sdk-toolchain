import React from 'react'
import _Modal from 'react-modal'

import { Props } from './types'

import './Modal.css'

const Modal = ({ children, className = '', overlayClassName = '', ...props }: Props) => {
  return (
    <_Modal
      ariaHideApp={false}
      className={`${className} Modal`}
      overlayClassName={`${overlayClassName} ModalOverlay`}
      {...props}
    >
      {children}
    </_Modal>
  )
}

export default React.memo(Modal)
