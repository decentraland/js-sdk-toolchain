import React from 'react'

export type Props = React.InputHTMLAttributes<HTMLElement> & {
  type?: 'checkbox'
  label?: React.ReactNode
  error?: string | boolean
  className?: string
  disabled?: boolean
}
