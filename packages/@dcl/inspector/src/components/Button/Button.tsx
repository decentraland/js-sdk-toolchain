import cx from 'classnames'

import { PropTypes } from './types'
import './Button.css'

function Button({ size, type, ...props }: PropTypes) {
  return (
    <button {...props} className={cx('Button', size, type, props.className)}>
      {props.children}
    </button>
  )
}

export default Button
