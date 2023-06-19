import mitt from 'mitt'
import { useEffect, useState } from 'react'

import { AssetCatalogResponse } from '../../tooling-entrypoint'
import { useAppSelector } from '../../redux/hooks'
import { getDataLayer } from '../../redux/data-layer'

type FileSystemEvent = { change: unknown }
export const fileSystemEvent = mitt<FileSystemEvent>()

export const removeBasePath = (basePath: string, path: string) => {
  return basePath ? path.replace(basePath + '/', '') : path
}

/* istanbul ignore next */
export const useFileSystem = (): [AssetCatalogResponse, boolean] => {
  const [files, setFiles] = useState<AssetCatalogResponse>({ basePath: '', assets: [] })
  const dataLayer = useAppSelector(getDataLayer)

  const [init, setInit] = useState(false)

  const fetchFiles = async () => {
    if (!dataLayer) return
    const assets = await dataLayer.getAssetCatalog({})
    setFiles(assets)
  }

  useEffect(() => {
    fileSystemEvent.on('change', fetchFiles)
  }, [])

  useEffect(() => {
    void fetchFiles().then(() => setInit(true))
  }, [dataLayer])

  return [files, init]
}
