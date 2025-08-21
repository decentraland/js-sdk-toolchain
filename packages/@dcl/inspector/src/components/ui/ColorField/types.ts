import React from 'react'

export type Props = React.InputHTMLAttributes<HTMLElement> & {
  label?: React.ReactNode
  basic?: boolean
}

export type ColorOptions = {
  label: string
  value?: React.InputHTMLAttributes<HTMLElement>['value']
  leftContent?: React.ReactNode
  secondaryText?: string
  selected?: boolean
  disabled?: boolean
}
