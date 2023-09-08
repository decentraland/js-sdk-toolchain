import { AudioSource, AvatarAttach, engine, Entity, GltfContainer, Transform } from '@dcl/sdk/ecs'
import { Color3, Vector3 } from '@dcl/sdk/math'
import * as utils from '@dcl-sdk/utils'

/**
 * Sound is a separated from the coin entity so that you can
 * still hear it even when the coin is removed from the engine.
 */
const coinPickupSound = engine.addEntity()
Transform.create(coinPickupSound)
AudioSource.create(coinPickupSound, { audioClipUrl: 'sounds/coinPickup.mp3' })

export function createCoin(model: string, position: Vector3, size: Vector3, centerOffset?: Vector3): Entity {
  const entity = engine.addEntity()
  GltfContainer.create(entity, { src: model })
  Transform.create(entity, { position })

  utils.triggers.oneTimeTrigger(
    entity,
    1,
    1,
    [{ type: 'box' }],
    () => {
      Transform.getMutable(coinPickupSound).position = Transform.get(engine.PlayerEntity).position
      AudioSource.getMutable(coinPickupSound).playing = true
      engine.removeEntity(entity)
    },
    Color3.Yellow()
  )

  return entity
}

//utils.triggers.enableDebugDraw(true)
