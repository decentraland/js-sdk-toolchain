import { EditorComponentsTypes } from '../../lib/sdk/components'

export interface Props {
  catalog: AssetPack[]
  error: Error | null
  isLoading: boolean
}

// categories obtained from "builder.decentraland.org" catalog
export const CATEGORIES = [
  'decorations',
  'structures',
  'vehicles',
  'furniture',
  'appliances',
  'ground',
  'nature',
  'tiles',
  'year of the pig'
].sort()

export type AssetPack = {
  id: string
  name: string
  thumbnail: string
  assets: Asset[]
}

export type Asset = {
  id: string
  name: string
  category: string
  tags: string[]
  contents: Record<string, string>
  components: EditorComponentsTypes
}

export interface ThemeProps {
  onClick: (value: AssetPack) => void
  value: AssetPack
}

export interface CategoriesProps {
  onGoBack: () => void
  value: AssetPack
}

export interface AssetProps {
  value: Asset
}
