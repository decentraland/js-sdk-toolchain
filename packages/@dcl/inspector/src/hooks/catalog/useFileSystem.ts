import mitt from 'mitt'
import { useState } from 'react'

import { useSdk } from '../sdk/useSdk'
import { AssetCatalogResponse } from '../../tooling-entrypoint'

type FileSystemEvent = { change: unknown }
export const fileSystemEvent = mitt<FileSystemEvent>()

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
