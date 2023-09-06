import React, { useState } from 'react'
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io'

import { Props } from './types'

import './Container.css'

const Container: React.FC<React.PropsWithChildren<Props>> = (props) => {
  const [open, setOpen] = useState<boolean>(true)
  const Icon = open ? <IoIosArrowDown className="icon" /> : <IoIosArrowForward className="icon" />
  return (
    <div className={`Container ${props.className ?? ''}`}>
      {props.label && (
        <div className="title" onClick={() => setOpen(!open)}>
          {Icon}
          <span>{props.label}</span>
          {props.rightContent && <span className="right-content">{props.rightContent}</span>}
        </div>
      )}
      {open && <div className="content">{props.children}</div>}
    </div>
  )
}

export default React.memo(Container)
