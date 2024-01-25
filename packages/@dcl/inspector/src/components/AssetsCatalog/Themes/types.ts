import { AssetPack } from '../../../lib/logic/catalog'

export interface Props {
  catalog: AssetPack[]
  onClick: (value: AssetPack) => void
}
