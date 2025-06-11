import { Asset } from '../types'

export type PropTypes = {
  assets: Asset[]
  errorMessage: string
  onSubmit: () => void
}
