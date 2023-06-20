import { useEffect, useState } from 'react'
import { ITheme } from '../../components/AssetsCatalog'

export const CATALOG_URL = 'https://builder-api.decentraland.org/v1/assetPacks'

export const useCatalog = () => {
  const [catalog, setCatalog] = useState<ITheme[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    fetch(CATALOG_URL)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          const assetPacks = json.data.map((assetPack: any) => ({
            ...assetPack,
            assets: assetPack.assets.map((asset: any) => ({ ...asset, main: asset.model }))
          }))
          setCatalog(assetPacks)
        } else {
          setCatalog([])
          setError(new Error(json.message || 'Could not load catalog'))
        }
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
