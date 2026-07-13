import { Entity, IEngine, TransformType, engine } from '@dcl/ecs'
import {
  PlayerIdentityData as definePlayerIdenityData,
  AvatarBase as defineAvatarBase,
  AvatarEquippedData as defineAvatarEquippedData,
  PBAvatarBase,
  PBAvatarEquippedData,
  Transform as defineTransform
} from '@dcl/ecs/dist/components'

type GetPlayerDataReq = {
  userId: string
}
type GetPlayerDataRes = {
  entity: Entity
  name: string
  isGuest: boolean
  userId: string
  avatar?: PBAvatarBase
  wearables: PBAvatarEquippedData['wearableUrns']
  emotes: PBAvatarEquippedData['emoteUrns']
  position: TransformType['position'] | undefined
}

export function definePlayerHelper(engine: IEngine) {
  const Transform = defineTransform(engine)
  const PlayerIdentityData = definePlayerIdenityData(engine)
  const AvatarEquippedData = defineAvatarEquippedData(engine)
  const AvatarBase = defineAvatarBase(engine)
  const playerEntities = new Map<Entity, string>()
  const entitiesByAddress = new Map<string, Entity>()

  const onEnterSceneCb: ((player: GetPlayerDataRes) => void)[] = []
  const onLeaveSceneCb: ((userId: string) => void)[] = []

  engine.addSystem(() => {
    if (onEnterSceneCb.length === 0 && onLeaveSceneCb.length === 0) return

    for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
      if (!AvatarBase.has(entity)) continue

      if (!playerEntities.has(entity)) {
        playerEntities.set(entity, identity.address)
        entitiesByAddress.set(identity.address, entity)

        // Call onEnter callback
        if (onEnterSceneCb.length) {
          onEnterSceneCb.forEach((cb) => cb(getPlayer({ userId: identity.address })!))
        }

        // Check for changes/remove callbacks
        AvatarBase.onChange(entity, (value) => {
          if (!value && playerEntities.get(entity)) {
            const address = playerEntities.get(entity)!
            onLeaveSceneCb.forEach((cb) => cb(address))
            playerEntities.delete(entity)
            if (entitiesByAddress.get(address) === entity) {
              entitiesByAddress.delete(address)
            }
          }
        })
      }
    }
  })

  return {
    onEnterScene(cb: (player: GetPlayerDataRes) => void) {
      onEnterSceneCb.push(cb)
    },
    onLeaveScene(cb: (userId: string) => void) {
      onLeaveSceneCb.push(cb)
    },
    /**
     * Returns the info of the player if it's in the scene.
     */
    getPlayer(user?: GetPlayerDataReq): GetPlayerDataRes | null {
      function getEntity() {
        if (!user?.userId) return engine.PlayerEntity

        const cachedEntity = entitiesByAddress.get(user.userId)
        if (cachedEntity !== undefined) return cachedEntity

        for (const [entity, data] of engine.getEntitiesWith(PlayerIdentityData)) {
          if (data.address === user.userId) {
            return entity
          }
        }
        return undefined
      }

      const userEntity = getEntity()
      if (!userEntity) return null

      const playerData = PlayerIdentityData.getOrNull(userEntity)
      const avatarData = AvatarBase.getOrNull(userEntity)
      const wearablesData = AvatarEquippedData.getOrNull(userEntity)

      if (!playerData && !avatarData && !wearablesData) return null

      return {
        entity: userEntity,
        name: avatarData?.name ?? '',
        isGuest: !!playerData?.isGuest,
        userId: playerData?.address ?? '',
        avatar: avatarData ?? undefined,
        wearables: wearablesData?.wearableUrns ?? [],
        emotes: wearablesData?.emoteUrns ?? [],
        position: Transform.getOrNull(userEntity)?.position
      }
    }
  }
}

const players = definePlayerHelper(engine)
const { getPlayer, onEnterScene, onLeaveScene } = players

export { getPlayer, onEnterScene, onLeaveScene }
export default players
