import React from 'react'

export type Props = React.InputHTMLAttributes<HTMLElement> & {
  label?: string
  // Number of digits after the decimal point. Must be in the range 0 - 20, inclusive.
  fractionDigits?: number
}
