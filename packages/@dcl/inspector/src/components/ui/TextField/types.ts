import React from 'react'

export type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  drop?: boolean
  type?: 'text' | 'password' | 'email' | 'number'
  label?: React.ReactNode
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  rightLabel?: React.ReactNode
  error?: string | boolean
  className?: string
  disabled?: boolean
}
