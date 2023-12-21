import {
  EngineInfo as _EngineInfo,
  Entity,
  IEngine,
  NetworkEntity as _NetworkEntity,
  Schemas,
  LastWriteWinElementSetComponentDefinition,
  PBEngineInfo
} from '@dcl/ecs'
import { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'

import type { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'
import { SyncEntity } from './entities'
import { IProfile } from './message-bus-sync'

// Component to track all the players and when they enter to the scene.
// Know who is in charge of sending the initial state (oldest one)
export const definePlayersInScene = (engine: IEngine) =>
  engine.defineComponent('players-scene', {
    timestamp: Schemas.Number,
    userId: Schemas.String
  })

// Already initialized my state. Ignore new states messages.
export let stateInitialized = false

// My player entity to check if I'm the oldest player in the scend
export let playerSceneEntity: Entity

export function setInitialized() {
  stateInitialized = true
}

// Flag to avoid sending over the wire all the initial messages that the engine add's to the rendererTransport
// INITIAL_CRDT_MESSAGES that are being processed on the onStart loop, before the onUpdate.
export let INITIAL_CRDT_RENDERER_MESSAGES_SENT = false

// Retrieve userId to start sending this info as the networkId
export function fetchProfile(
  myProfile: IProfile,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>
) {
  void getUserData({}).then(({ data }) => {
    if (data?.userId) {
      const userId = data.userId
      const networkId = componentNumberFromName(data.userId)
      myProfile.networkId = networkId
      myProfile.userId = userId
    } else {
      throw new Error(`Couldn't fetch profile data`)
    }
  })
}

/**
 * Add's the user information about when he joined the scene.
 * It's used to check who is the oldest one, to sync the state
 */
export function createPlayerTimestampData(engine: IEngine, profile: IProfile, syncEntity: SyncEntity) {
  if (!profile?.userId) return undefined
  const PlayersInScene = definePlayersInScene(engine)
  const entity = engine.addEntity()
  PlayersInScene.create(entity, { timestamp: Date.now(), userId: profile.userId })
  syncEntity(entity, [PlayersInScene.componentId])
  playerSceneEntity = entity
  return playerSceneEntity
}

/**
 * Check if I'm the older user to send the initial state
 */
export function oldestUser(engine: IEngine, profile: IProfile, syncEntity: SyncEntity): boolean {
  const PlayersInScene = definePlayersInScene(engine)
  // When the user leaves the scene but it's still connected.
  if (!PlayersInScene.has(playerSceneEntity)) {
    createPlayerTimestampData(engine, profile, syncEntity)
    return oldestUser(engine, profile, syncEntity)
  }
  const { timestamp } = PlayersInScene.get(playerSceneEntity)
  for (const [_, player] of engine.getEntitiesWith(PlayersInScene)) {
    if (player.timestamp < timestamp) return false
  }
  return true
}

/**
 * Ignore CRDT's initial messages from the renderer.
 */
export function syncTransportIsReady(engine: IEngine) {
  const EngineInfo = engine.getComponent(
    _EngineInfo.componentId
  ) as LastWriteWinElementSetComponentDefinition<PBEngineInfo>
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
// TODO: Had to comment all the logic because getConnectedPlayers was not working as expected
// A lot of raise conditions. For now we will go with the approach that every client that it's initialized will send his crdt state.
export function stateInitializedChecker(engine: IEngine, _profile: IProfile, _syncEntity: SyncEntity) {
  // const PlayersInScene = definePlayersInScene(engine)
  const EngineInfo = engine.getComponent(_EngineInfo.componentId) as typeof _EngineInfo
  // const NetworkEntity = engine.getComponent(_NetworkEntity.componentId) as INetowrkEntity
  async function enterScene() {
    // if (!playerSceneEntity) {
    //   createPlayerTimestampData(engine, profile, syncEntity)
    // }

    /**
     * Keeps PlayersInScene up-to-date with the current players.
     */
    // const connectedPlayers = await getConnectedPlayers({})
    // for (const [entity, player] of engine.getEntitiesWith(PlayersInScene)) {
    //   if (!connectedPlayers.players.find(($) => $.userId === player.userId)) {
    //     PlayersInScene.deleteFrom(entity)
    //   }
    // }

    // Wait for comms to be ready ?? ~3000ms
    if ((EngineInfo.getOrNull(engine.RootEntity)?.tickNumber ?? 0) > 100) {
      setInitialized()
      return
    }

    // If we already have data from players, dont send the heartbeat messages
    // if (connectedPlayers.players.length) return

    // if (!stateInitialized && playerSceneEntity) {
    //   // Send this data to all the players connected (new and old)
    //   // So everyone can decide if it's the oldest one or no.
    //   // It's for the case that multiple users enters ~ at the same time.
    //   PlayersInScene.getMutable(playerSceneEntity)
    // }
  }
  void enterScene()
}
