import { useEffect, useState } from 'react'
import { AssetPack } from '../../components/AssetsCatalog/types'

export const CATALOG_URL = 'https://builder-items.decentraland.org/catalog.json'

export const useCatalog = () => {
  const [catalog, setCatalog] = useState<AssetPack[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    fetch(CATALOG_URL)
      .then((res) => res.json())
      .then((json) => {
        const assetPacks = json.assetPacks as AssetPack[]
        setCatalog(assetPacks)
        setIsLoading(false)
      })
      .catch((reason) => {
        if (reason instanceof Error) {
          setError(reason)
        } else if (typeof reason === 'string') {
          setError(new Error(reason))
        } else {
          setError(new Error('Could not load catalog'))
        }
        setCatalog([])
        setIsLoading(false)
      })
  }, [])

  return [catalog, error, isLoading] as const
}
