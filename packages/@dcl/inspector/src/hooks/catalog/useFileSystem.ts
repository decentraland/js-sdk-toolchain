import mitt from 'mitt'
import { useState } from 'react'

import { useSdk } from '../sdk/useSdk'
import { AssetCatalogResponse } from '../../tooling-entrypoint'

type FileSystemEvent = { change: unknown }
export const fileSystemEvent = mitt<FileSystemEvent>()

/* istanbul ignore next */
export const useFileSystem = (): [AssetCatalogResponse, boolean] => {
  const [files, setFiles] = useState<AssetCatalogResponse>({ basePath: '', assets: [] })
  const [init, setInit] = useState(false)
  useSdk(({ dataLayer }) => {
    async function fetchFiles() {
      const assets = await dataLayer.getAssetCatalog({})
      setFiles(assets)
    }
    fileSystemEvent.on('change', fetchFiles)
    void fetchFiles().then(() => setInit(true))
  })

  return [files, init]
}
