import React from 'react'

export type Props = React.InputHTMLAttributes<Omit<HTMLElement, 'type'>> & {
  label?: React.ReactNode
  rightLabel?: string
  error?: string | boolean
  info?: React.ReactNode
  isValidValue?: (value: any) => boolean
}
