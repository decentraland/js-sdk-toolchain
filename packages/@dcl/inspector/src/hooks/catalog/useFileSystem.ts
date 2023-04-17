import { useState } from 'react'

import { useSdk } from '../sdk/useSdk'
import { AssetCatalogResponse } from '../../tooling-entrypoint'

export const useFileSystem = () => {
  const [files, setFiles] = useState<AssetCatalogResponse>({ basePath: '', assets: [] })

  useSdk(async ({ dataLayer }) => {
    const assets = await dataLayer.getAssetCatalog({})
    setFiles(assets)
  })

  // TODO: attach to some kind if "onChange" event on dataLayer to refresh files

  return { files }
}
