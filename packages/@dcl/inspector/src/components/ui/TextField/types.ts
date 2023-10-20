import React from 'react'

export type Props = React.InputHTMLAttributes<HTMLElement> & {
  drop?: boolean
  type?: 'text' | 'password' | 'email' | 'number'
  label?: React.ReactNode
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  rightLabel?: React.ReactNode
  error?: string | boolean
  className?: string
  isDisabled?: boolean
}
