import { Asset } from '../types'

export type PropTypes = {
  assets: AssetWithEmote[]
  onSubmit(assets: Asset[]): void
  isNameValid(asset: Asset, newName: string): boolean
}

export type AssetWithEmote = Asset & { isEmote?: boolean }

export type Thumbnails = Record<string, string>
