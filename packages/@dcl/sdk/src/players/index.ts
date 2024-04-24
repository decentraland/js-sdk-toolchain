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

function definePlayerHelper(engine: IEngine) {
  const Transform = defineTransform(engine)
  const PlayerIdentityData = definePlayerIdenityData(engine)
  const AvatarEquippedData = defineAvatarEquippedData(engine)
  const AvatarBase = defineAvatarBase(engine)
  const playerEntities = new Map<Entity, string>()

  let onEnterSceneCb: ((player: GetPlayerDataRes) => void) | undefined = undefined
  let onLeaveSceneCb: ((userId: string) => void) | undefined = undefined

  engine.addSystem(() => {
    const players = Array.from(engine.getEntitiesWith(PlayerIdentityData, AvatarBase))
    if (players.length === playerEntities.size) return

    for (const [entity, identity] of players) {
      if (!playerEntities.has(entity)) {
        playerEntities.set(entity, identity.address)

        // Call onEnter callback
        if (onEnterSceneCb) {
          onEnterSceneCb(getPlayer({ userId: identity.address })!)
        }

        // Check for changes/remove callbacks
        AvatarBase.onChange(entity, (value) => {
          if (!value && onLeaveSceneCb && playerEntities.get(entity)) {
            onLeaveSceneCb(playerEntities.get(entity)!)
            playerEntities.delete(entity)
          }
        })
      }
    }
  })

  return {
    onEnterScene(cb: (player: GetPlayerDataRes) => void) {
      onEnterSceneCb = cb
    },
    onLeaveScene(cb: (userId: string) => void) {
      onLeaveSceneCb = cb
    },
    /**
     * Returns the info of the player if it's in the scene.
     */
    getPlayer(user?: GetPlayerDataReq): GetPlayerDataRes | null {
      function getEntity() {
        if (!user?.userId) return engine.PlayerEntity
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
        isGuest: !!playerData?.isGuest ?? false,
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
