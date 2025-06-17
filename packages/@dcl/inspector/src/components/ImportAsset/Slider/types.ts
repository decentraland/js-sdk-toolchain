import { Asset } from '../types'

export type PropTypes = {
  assets: Asset[]
  onSubmit(assets: Asset[]): void
  isNameValid(asset: Asset, newName: string): boolean
}

export type Thumbnails = Record<string, string>
