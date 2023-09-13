import { Asset, AssetPack } from '../../lib/logic/catalog'

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

export interface Props {
  catalog: AssetPack[]
}
