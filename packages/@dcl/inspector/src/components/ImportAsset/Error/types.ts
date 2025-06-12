import { Asset } from '../types'

export type Action = {
  name: string
  onClick: () => void
}

export type PropTypes = {
  assets: Asset[]
  errorMessage: string
  primaryAction: Action
  secondaryAction?: Action
}
