import { useMemo } from 'react'

import { AssetCatalogResponse } from '../../tooling-entrypoint'
import { buildAssetTree } from '../../components/ProjectAssetExplorer/utils'
import { removeBasePath } from '../../lib/logic/remove-base-path'

/* istanbul ignore next */
export const useAssetTree = (files: AssetCatalogResponse) => {
  const tree = useMemo(
    () => buildAssetTree(files.assets.map((item) => removeBasePath(files.basePath, item.path))),
    [files]
  )
  return { tree }
}
