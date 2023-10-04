import React from 'react'

export type Props = React.InputHTMLAttributes<Omit<HTMLElement, 'type'>> & {
  label?: string
  rightLabel?: string
  error?: boolean
}
