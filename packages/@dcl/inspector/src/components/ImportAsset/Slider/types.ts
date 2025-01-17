import { Asset } from '../types'

export type PropTypes = {
  assets: Asset[]
  onSubmit: (assets: Asset[]) => void
}

export type Thumbnails = Record<string, string>
