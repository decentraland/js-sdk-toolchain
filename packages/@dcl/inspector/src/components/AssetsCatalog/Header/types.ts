import { AssetPack } from '../../../lib/logic/catalog'

export interface Props {
  selectedTheme: AssetPack | undefined
  onChangeTheme: (value?: AssetPack) => void
  onSearch: (value: string) => void
}
