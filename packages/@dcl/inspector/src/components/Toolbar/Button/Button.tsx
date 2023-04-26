import React from 'react'
import cx from 'classnames'
import './Button.css'

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  const { className, ...rest } = props
  return <button className={cx('Button', className)} {...rest} />
}

export default React.memo(Button)
