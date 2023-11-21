import { EngineInfo, Entity, Schemas, engine } from '@dcl/ecs'
import { syncEntity } from './sync-entity'
import { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'
import { getUserData } from '~system/UserIdentity'
import { getConnectedPlayers } from '~system/Players'
import { onLeaveScene } from '../observables'

// Component to track all the players and when they enter to the scene.
// Know who is in charge of sending the initial state (oldest one)
export const PlayersInScene = engine.defineComponent('players-scene', {
  timestamp: Schemas.Number,
  userId: Schemas.Int64
})

// Already initialized my state. Ignore new states messages.
export let stateInitialized = false

// My player entity to check if I'm the oldest player in the scend
export let playerSceneEntity: Entity

// My profile data. UserId and NetworkId used to sync entities
export let myProfile: { networkId: number; userId: string }

export function getNetworkId() {
  return myProfile?.networkId
}

export function setInitialized() {
  stateInitialized = true
}

// Flag to avoid sending over the wire all the initial messages that the engine add's to the rendererTransport
// INITIAL_CRDT_MESSAGES that are being processed on the onStart loop, before the onUpdate.
export let INITIAL_CRDT_RENDERER_MESSAGES_SENT = false

// Retrieve userId to start sending this info as the networkId
export async function getOwnProfile(): Promise<typeof myProfile> {
  if (myProfile) return myProfile
  const { data } = await getUserData({})
  if (data?.userId) {
    const userId = data.userId
    const networkId = componentNumberFromName(data.userId)
    myProfile = { userId, networkId }
    return myProfile
  }
  return getOwnProfile()
}

/**
 * Add's the user information about when he joined the scene.
 * It's used to check who is the oldest one, to sync the state
 */
export function createPlayerTimestampData() {
  if (!myProfile?.networkId) return undefined
  const entity = engine.addEntity()
  PlayersInScene.create(entity, { timestamp: Date.now(), userId: myProfile.networkId })
  syncEntity(entity, [PlayersInScene.componentId])
  playerSceneEntity = entity
  return playerSceneEntity
}

/**
 * Check if I'm the older user to send the initial state
 */
export function oldestUser() {
  const { timestamp } = PlayersInScene.get(playerSceneEntity)
  for (const [_, player] of engine.getEntitiesWith(PlayersInScene)) {
    if (player.timestamp < timestamp) return false
  }
  return true
}

/**
 * Function to delete user's data that left the scene.
 * Keeps PlayersInScene up-to-date with the current players.
 */
export function addOnLeaveSceneListener() {
  onLeaveScene.add(({ userId }) => {
    const networkId = componentNumberFromName(userId)
    for (const [entity, player] of engine.getEntitiesWith(PlayersInScene)) {
      if (player.userId === networkId) {
        PlayersInScene.deleteFrom(entity)
      }
    }
  })
}

/**
 * Ignore CRDT's initial messages from the renderer.
 */
export function syncTransportIsReady() {
  if (!INITIAL_CRDT_RENDERER_MESSAGES_SENT) {
    const engineInfo = EngineInfo.getOrNull(engine.RootEntity)
    if (engineInfo && engineInfo.tickNumber > 2) {
      INITIAL_CRDT_RENDERER_MESSAGES_SENT = true
    }
  }
  return INITIAL_CRDT_RENDERER_MESSAGES_SENT
}

/**
 * Check if we are already initialized
 * Add the playerSceneData component and syncronize it till we receive the state.
 * This fn should be added as a system so it runs on every tick
 */
export function stateInitializedChecker() {
  // Wait for comms to be ready ?? ~3000ms
  if ((EngineInfo.getOrNull(engine.RootEntity)?.tickNumber ?? 0) > 100) {
    setInitialized()
    return
  }

  async function enterScene() {
    if (!playerSceneEntity) {
      createPlayerTimestampData()
    }

    // If we already have data from players, dont send the heartbeat messages
    const connectedPlayers = await getConnectedPlayers({})
    if (connectedPlayers.players.length) {
      return
    }

    if (!stateInitialized && playerSceneEntity) {
      // Send this data to all the players connected (new and old)
      // So everyone can decide if it's the oldest one or no.
      // It's for the case that multiple users enters ~ at the same time.
      PlayersInScene.getMutable(playerSceneEntity)
    }
  }
  void enterScene()
}
