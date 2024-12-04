import { Entity } from '@dcl/ecs'
import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useSdk } from './useSdk'
import { AssetData } from '../../lib/logic/catalog'
import { createCustomAsset } from '../../redux/data-layer'

export const useCustomAsset = () => {
  const sdk = useSdk()
  const dispatch = useDispatch()

  const create = useCallback(
    (entities: Entity | Entity[]): { composite: AssetData['composite']; resources: string[] } | undefined => {
      if (!sdk) return undefined
      const entityArray = Array.isArray(entities) ? entities : [entities]
      const asset = sdk.operations.createCustomAsset(entityArray)
      if (asset) {
        dispatch(createCustomAsset(asset))
      }

      return asset
    },
    [sdk, dispatch]
  )

  return { create }
}

export default useCustomAsset
