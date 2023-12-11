import { useCallback, useEffect, useMemo } from 'react'
import cx from 'classnames'
import { PBVisibilityComponent, PBGltfContainer, PBMeshCollider } from '@dcl/ecs'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { CoreComponents } from '../../../lib/sdk/components'
import { InfoTooltip } from '../../ui/InfoTooltip'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { Dropdown } from '../../ui/Dropdown'
import { COLLISION_LAYERS } from '../GltfInspector/utils'
import { Props } from './types'

export default withSdk<Props>(({ sdk, entity }) => {
  const { VisibilityComponent, GltfContainer, MeshCollider } = sdk.components
  const hasVisibilityComponent = useHasComponent(entity, VisibilityComponent)
  const hasGltfContainer = useHasComponent(entity, GltfContainer)
  const hasMeshCollider = useHasComponent(entity, MeshCollider)
  const [componentValue, setComponentValue] = useComponentValue<PBVisibilityComponent>(entity, VisibilityComponent)
  const [gltfComponentValue, setGltfComponentValue, isGltfComponentEqual] = useComponentValue<PBGltfContainer>(
    entity,
    GltfContainer
  )
  const [meshColliderValue, setMeshColliderValue, isMeshColliderEqual] = useComponentValue<PBMeshCollider>(
    entity,
    MeshCollider
  )

  const colliderValue = useMemo(() => {
    return gltfComponentValue.invisibleMeshesCollisionMask ?? meshColliderValue.collisionMask ?? 0
  }, [gltfComponentValue, meshColliderValue])

  useEffect(() => {
    if (componentValue.visible === undefined) {
      setComponentValue({ ...componentValue, visible: true })
    }
  }, [componentValue])

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, VisibilityComponent)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entity, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: CoreComponents.VISIBILITY_COMPONENT,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])

  const handleChangeVisibility = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setComponentValue({ ...componentValue, visible: value === 'true' })
    },
    [entity, componentValue]
  )

  const handleChangeCollider = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      const currentGltfContainer = GltfContainer.getOrNull(entity)
      const currentMeshCollider = MeshCollider.getOrNull(entity)
      const invisibleMeshesCollisionMask = parseInt(value, 10)

      if (currentGltfContainer) {
        if (isGltfComponentEqual({ ...currentGltfContainer, invisibleMeshesCollisionMask })) {
          return
        }

        setGltfComponentValue({ ...currentGltfContainer, invisibleMeshesCollisionMask })
      } else if (currentMeshCollider) {
        if (isMeshColliderEqual({ ...currentMeshCollider, collisionMask: invisibleMeshesCollisionMask })) {
          return
        }

        setMeshColliderValue({ ...currentMeshCollider, collisionMask: invisibleMeshesCollisionMask })
      }
    },
    [entity, gltfComponentValue, meshColliderValue]
  )

  const renderVisibilityMoreInfo = useCallback(() => {
    return (
      <InfoTooltip
        text={
          'Use the Visibility property to hide an item during scene execution while keeping it visible in the editor.'
        }
      />
    )
  }, [])

  const renderPhysicsCollidersMoreInfo = useCallback(() => {
    return (
      <InfoTooltip
        text={'Use the Collider property to turn on or off physical or clickable interaction with this item.'}
      />
    )
  }, [])

  if (!hasVisibilityComponent || (!hasGltfContainer && !hasMeshCollider)) return null

  return (
    <Container label="Visibility" className={cx('VisibilityContainer')} onRemoveContainer={handleRemove}>
      <Block>
        <Dropdown
          label={<>Visibility {renderVisibilityMoreInfo()}</>}
          options={[
            { value: 'true', label: 'Visible' },
            { value: 'false', label: 'Invisible' }
          ]}
          value={(componentValue.visible ?? true).toString()}
          onChange={handleChangeVisibility}
        />

        <Dropdown
          label={<>Collider {renderPhysicsCollidersMoreInfo()}</>}
          options={COLLISION_LAYERS}
          value={colliderValue}
          onChange={handleChangeCollider}
        />
      </Block>
    </Container>
  )
})
