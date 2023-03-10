import { useEffect, useState } from 'react'
import { ITheme } from '../../components/AssetsCatalog'

export const useCatalog = () => {
  const [catalog, setCatalog] = useState<ITheme[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    fetch('https://builder-api.decentraland.org/v1/assetPacks')
      .then((res) => res.json())
      .then((json) =>
        json.ok
          ? setCatalog(
              json.data.map((assetPack: any) => ({
                ...assetPack,
                assets: assetPack.assets.map((asset: any) => ({ ...asset, main: asset.model }))
              }))
            )
          : setError(new Error(json.message || 'Could not load catalog'))
      )
      .catch((reason) => {
        if (reason instanceof Error) {
          setError(reason)
        } else if (typeof reason === 'string') {
          setError(new Error(reason))
        } else {
          setError(new Error('Could not load catalog'))
        }
      })
  }, [])
  return [catalog, error] as const
}
