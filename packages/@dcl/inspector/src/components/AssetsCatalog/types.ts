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

export interface Props {
  value: ITheme[]
}

export interface ITheme {
  id: string
  title: string
  thumbnail: string
  created_at: string
  updated_at: string
  assets: IAsset[]
}

export interface IAsset {
  id: string
  name: string
  main: string
  type: 'gltf' | 'composite'
  thumbnail: string
  tags: []
  category: string
  contents: { [key: IAsset['main']]: string }
  created_at: string
  updated_at: string
}

export interface ThemeProps {
  onClick: (value: ITheme) => void
  value: ITheme
}

export interface CategoriesProps {
  onGoBack: () => void
  value: ITheme
}

export interface AssetProps {
  value: IAsset
}
