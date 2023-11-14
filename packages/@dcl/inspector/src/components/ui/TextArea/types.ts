import React from 'react'

export type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string
  disabled?: boolean
  error?: string | boolean
  label?: string
  moreInfo?: React.ReactNode
}
