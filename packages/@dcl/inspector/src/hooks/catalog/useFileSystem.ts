import { useState } from 'react'

import { useSdk } from '../sdk/useSdk'
import { AssetCatalogResponse } from '../../tooling-entrypoint'
import { fileSystemEvent } from '../../lib/data-layer/host/upsert-asset'

/* istanbul ignore next */
export const useFileSystem = () => {
  const [files, setFiles] = useState<AssetCatalogResponse>({ basePath: '', assets: [] })
  useSdk(async ({ dataLayer }) => {
    async function fetchFiles() {
      const assets = await dataLayer.getAssetCatalog({})
      setFiles(assets)
    }
    fileSystemEvent.on('change', fetchFiles)
    await fetchFiles()
  })

  return [files]
}
