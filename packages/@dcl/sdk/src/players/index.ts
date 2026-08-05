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

  const onEnterSceneCb: ((player: GetPlayerDataRes) => void)[] = []
  const onLeaveSceneCb: ((userId: string) => void)[] = []

  // Both directions are polled. The `players.length === playerEntities.size`
  // shortcut this replaces went blind on a frame where one player joined and
  // another left, and the per-entity `AvatarBase.onChange` that used to report a
  // departure never fired for a player whose entity was removed whole.
  engine.addSystem(() => {
    const present = new Set<Entity>()
    for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData, AvatarBase)) {
      present.add(entity)
      if (playerEntities.has(entity)) continue
      playerEntities.set(entity, identity.address)
      for (const cb of onEnterSceneCb) cb(getPlayer({ userId: identity.address })!)
    }
    for (const [entity, address] of playerEntities) {
      if (present.has(entity)) continue
      playerEntities.delete(entity)
      for (const cb of onLeaveSceneCb) cb(address)
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

type PlayerHelper = ReturnType<typeof definePlayerHelper>
const helpers = new WeakMap<IEngine, PlayerHelper>()

/**
 * One helper per engine. Both the public API below and `addSyncTransport` need
 * one, and two of them on the same engine means two identical per-frame diffs
 * and every `onEnterScene` callback firing twice.
 */
export function getPlayerHelper(engine: IEngine): PlayerHelper {
  const existing = helpers.get(engine)
  if (existing) return existing
  const helper = definePlayerHelper(engine)
  helpers.set(engine, helper)
  return helper
}

const players = getPlayerHelper(engine)
const { getPlayer, onEnterScene, onLeaveScene } = players

export { getPlayer, onEnterScene, onLeaveScene }
export default players
