import { useMemo } from 'react'

import { AssetCatalogResponse } from '../../tooling-entrypoint'
import { buildAssetTree } from '../../components/ProjectAssetExplorer/utils'

/* istanbul ignore next */
export const useAssetTree = (files: AssetCatalogResponse) => {
  const tree = useMemo(() => buildAssetTree(files.assets.map((item) => item.path)), [files])
  return { tree }
}
