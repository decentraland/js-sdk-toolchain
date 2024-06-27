import {
  EngineInfo as _EngineInfo,
  PlayerIdentityData as _PlayerIdentityData,
  IEngine,
  NetworkEntity as _NetworkEntity,
  LastWriteWinElementSetComponentDefinition,
  PBEngineInfo
} from '@dcl/ecs'
import { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'

import type { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'
import { IProfile } from './message-bus-sync'

// Already initialized my state. Ignore new states messages.
export let stateInitialized = false

export function setInitialized() {
  stateInitialized = true
}

// Flag to avoid sending over the wire all the initial messages that the engine add's to the rendererTransport
// INITIAL_CRDT_MESSAGES that are being processed on the onStart loop, before the onUpdate.
export let INITIAL_CRDT_RENDERER_MESSAGES_SENT = false

// Retrieve userId to start sending this info as the networkId
// This should use the PlayerIdentityData component but it's not being populated on the first frame.
export async function fetchProfile(
  engine: IEngine,
  myProfile: IProfile,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>
) {
  console.log('[fetchProfile]')
  if (myProfile.userId) return myProfile
  const PlayerIdentityData = engine.getComponent(_PlayerIdentityData.componentId) as typeof _PlayerIdentityData
  const player = PlayerIdentityData.getOrNull(engine.PlayerEntity)
  const userId = player?.address ?? (await getUserData({})).data?.userId

  console.log('[fetchProfile] Finished fetching profile')

  if (userId) {
    const networkId = componentNumberFromName(userId)
    myProfile.networkId = networkId
    myProfile.userId = userId
    return myProfile
  } else {
    throw new Error(`Couldn't fetch profile data`)
  }
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
 * This fn should be added as a system so it runs on every tick
 */
export function stateInitializedChecker(engine: IEngine) {
  const EngineInfo = engine.getComponent(_EngineInfo.componentId) as typeof _EngineInfo

  if ((EngineInfo.getOrNull(engine.RootEntity)?.tickNumber ?? 0) > 100) {
    setInitialized()
    return
  }
}
