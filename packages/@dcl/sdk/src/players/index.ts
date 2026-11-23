import { Entity, IEngine, TransformType, engine } from '@dcl/ecs'
import {
  PlayerIdentityData as definePlayerIdenityData,
  AvatarBase as defineAvatarBase,
  AvatarEquippedData as defineAvatarEquippedData,
  PBAvatarBase,
  PBAvatarEquippedData,
  Transform as defineTransform
} from '@dcl/ecs/dist/components'
import { getSceneInformation } from '~system/Runtime'

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

const PARCEL_SIZE = 16
const SCENE_PARCELS_TIMEOUT_SECONDS = 10

type SceneParcels = {
  baseX: number
  baseZ: number
  parcels: Set<string>
}

function parseSceneParcels(metadataJson: string): SceneParcels | null {
  const scene = JSON.parse(metadataJson)?.scene
  const base = typeof scene?.base === 'string' ? scene.base.split(',').map(Number) : []
  const parcels: unknown[] = Array.isArray(scene?.parcels) ? scene.parcels : []
  if (base.length !== 2 || !base.every(Number.isInteger) || !parcels.length) return null

  return {
    baseX: base[0],
    baseZ: base[1],
    parcels: new Set(parcels.map((parcel) => String(parcel).replace(/\s/g, '')))
  }
}

function isInsideParcels(scene: SceneParcels, position: TransformType['position']): boolean {
  const x = scene.baseX + Math.floor(position.x / PARCEL_SIZE)
  const z = scene.baseZ + Math.floor(position.z / PARCEL_SIZE)
  return scene.parcels.has(`${x},${z}`)
}

let sceneParcelsPromise: Promise<SceneParcels | null> | undefined

function loadSceneParcels(): Promise<SceneParcels | null> {
  if (!sceneParcelsPromise) {
    sceneParcelsPromise = Promise.resolve()
      .then(() => getSceneInformation({}))
      .then(({ metadataJson }) => parseSceneParcels(metadataJson))
  }
  return sceneParcelsPromise
}

export function definePlayerHelper(engine: IEngine) {
  const Transform = defineTransform(engine)
  const PlayerIdentityData = definePlayerIdenityData(engine)
  const AvatarEquippedData = defineAvatarEquippedData(engine)
  const AvatarBase = defineAvatarBase(engine)
  const playerEntities = new Map<Entity, string>()

  const onEnterSceneCb: ((player: GetPlayerDataRes) => void)[] = []
  const onLeaveSceneCb: ((userId: string) => void)[] = []

  function getPlayer(user?: GetPlayerDataReq): GetPlayerDataRes | null {
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
      // Component reads come back deeply readonly, so these are copied rather than
      // aliased: the public Player type promises plain mutable arrays, and handing
      // out the component's own frozen array would throw on any caller that writes.
      wearables: [...(wearablesData?.wearableUrns ?? [])],
      emotes: [...(wearablesData?.emoteUrns ?? [])],
      position: Transform.getOrNull(userEntity)?.position
    }
  }

  // undefined while loading, null when the scene metadata has no usable parcels
  let sceneParcels: SceneParcels | null | undefined = undefined
  let sceneParcelsWait = 0
  loadSceneParcels()
    .then((parcels) => {
      if (sceneParcels === undefined) sceneParcels = parcels
    })
    .catch(() => {
      if (sceneParcels === undefined) sceneParcels = null
    })
  let localPlayerInside = false
  let localPlayerAddress = ''

  // The Explorer keeps the local player's components in every scene, so they can't tell when it walks in or out
  function updateLocalPlayer(parcels: SceneParcels) {
    const identity = PlayerIdentityData.getOrNull(engine.PlayerEntity)
    const position = Transform.getOrNull(engine.PlayerEntity)?.position
    const inside = !!identity && !!position && AvatarBase.has(engine.PlayerEntity) && isInsideParcels(parcels, position)
    if (inside === localPlayerInside) return

    localPlayerInside = inside
    if (inside) {
      localPlayerAddress = identity!.address
      onEnterSceneCb.forEach((cb) => cb(getPlayer()!))
    } else {
      onLeaveSceneCb.forEach((cb) => cb(localPlayerAddress))
    }
  }

  engine.addSystem((dt) => {
    if (sceneParcels === undefined) {
      sceneParcelsWait += dt
      if (sceneParcelsWait >= SCENE_PARCELS_TIMEOUT_SECONDS) {
        sceneParcels = null
        console.log('[players] getSceneInformation did not answer, tracking the local player by its components')
      }
    } else if (sceneParcels) {
      updateLocalPlayer(sceneParcels)
    }

    for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData, AvatarBase)) {
      if (entity === engine.PlayerEntity && sceneParcels !== null) continue
      if (!playerEntities.has(entity)) {
        playerEntities.set(entity, identity.address)

        // Call onEnter callback
        if (onEnterSceneCb.length) {
          onEnterSceneCb.forEach((cb) => cb(getPlayer({ userId: identity.address })!))
        }

        // Check for changes/remove callbacks
        AvatarBase.onChange(entity, (value) => {
          if (!value && playerEntities.get(entity)) {
            onLeaveSceneCb.forEach((cb) => cb(playerEntities.get(entity)!))
            playerEntities.delete(entity)
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
    getPlayer
  }
}

const players = definePlayerHelper(engine)
const { getPlayer, onEnterScene, onLeaveScene } = players

export { getPlayer, onEnterScene, onLeaveScene }
export default players
