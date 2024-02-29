import React from 'react'
import cx from 'classnames'

import { Props } from './types'

import './Tab.css'

const Tab: React.FC<React.PropsWithChildren<Props>> = (props) => {
  const classNames = cx('Tab', props.className, { active: props.active })
  return (
    <div className={classNames} onClick={props.onClick}>
      {props.children}
    </div>
  )
}

export default React.memo(Tab)
