import React from 'react'

export type Props = React.InputHTMLAttributes<Omit<HTMLElement, 'type'>> & {
  label?: string | React.ReactNode
  rightLabel?: string
  error?: string | boolean
  isValidValue?: (value: any) => boolean
}
