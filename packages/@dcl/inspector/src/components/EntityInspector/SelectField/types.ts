import React from 'react'

export type Props = React.SelectHTMLAttributes<HTMLElement> & {
  label?: string
  options?: React.OptionHTMLAttributes<HTMLElement>[]
}
