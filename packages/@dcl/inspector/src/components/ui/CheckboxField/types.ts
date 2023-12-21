import React from 'react'

export type Props = Omit<React.InputHTMLAttributes<HTMLElement>, 'onChange'> & {
  type?: 'checkbox'
  label?: React.ReactNode
  error?: string | boolean
  className?: string
  disabled?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}
