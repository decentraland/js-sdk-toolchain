import { Observable } from './internal/Observable'
import { Vector3Type, engine, PlayerIdentityData, Transform } from '@dcl/ecs'
import { ManyEntityAction, SendBatchResponse, subscribe } from '~system/EngineApi'

let subscribeFunction: typeof subscribe = subscribe

const wrappedSubscribeFunction = instanceSubscriberFunction()
function createSubscriber(eventName: string) {
  return () => {
    wrappedSubscribeFunction(eventName)
  }
}

/// --- EVENTS ---

/** @public */
export type IEventNames = keyof IEvents

/**
 * @public
 * Note: Don't use `on` prefix for IEvents to avoid redundancy with `event.on("onEventName")` syntax.
 */
export interface IEvents {
  playerExpression: {
    expressionId: string
  }

  /**
   * This event gets triggered when the user enters the scene
   */
  onEnterScene: {
    userId: string
  }

  /**
   * This event gets triggered when the user leaves the scene
   */
  onLeaveScene: {
    userId: string
  }

  /**
   * This event gets triggered after receiving a comms message.
   */
  comms: {
    sender: string
    message: string
  }

  /** This is trigger everytime a profile is changed */
  profileChanged: {
    ethAddress: string
    version: number
  }

  /** Triggered when peer's avatar is connected and visible */
  playerConnected: {
    userId: string
  }

  /** Triggered when peer disconnect and/or it avatar is set invisible by comms */
  playerDisconnected: {
    userId: string
  }

  /** Triggered when current realm or island changes */
  onRealmChanged: {
    domain: string
    room: string
    serverName: string
    displayName: string
  }

  /** Triggered when other player's avatar is clicked */
  playerClicked: {
    userId: string
    ray: {
      origin: Vector3Type
      direction: Vector3Type
      distance: number
    }
  }
}

/**
 * These events are triggered after your character enters the scene.
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onEnterSceneObservable = new Observable<IEvents['onEnterScene']>(createSubscriber('onEnterScene'))
/** @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed. Use onEnterSceneObservable instead. */
export const onEnterScene = onEnterSceneObservable

/**
 * These events are triggered after your character leaves the scene.
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onLeaveSceneObservable = new Observable<IEvents['onLeaveScene']>(createSubscriber('onLeaveScene'))

/** @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed. Use onLeaveSceneObservable instead. */
export const onLeaveScene = onLeaveSceneObservable

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onPlayerExpressionObservable = new Observable<IEvents['playerExpression']>(
  createSubscriber('playerExpression')
)

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onProfileChanged = new Observable<IEvents['profileChanged']>(createSubscriber('profileChanged'))

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onPlayerConnectedObservable = new Observable<IEvents['playerConnected']>(
  createSubscriber('playerConnected')
)

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onPlayerDisconnectedObservable = new Observable<IEvents['playerDisconnected']>(
  createSubscriber('playerDisconnected')
)

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onRealmChangedObservable = new Observable<IEvents['onRealmChanged']>(createSubscriber('onRealmChanged'))

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onPlayerClickedObservable = new Observable<IEvents['playerClicked']>(createSubscriber('playerClicked'))

/**
 * @internal
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onCommsMessage = new Observable<IEvents['comms']>(createSubscriber('comms'))

/**
 * @internal
 * Used for testing purpose
 */
export function setSubscribeFunction(fn: (event: { eventId: string }) => Promise<any>) {
  subscribeFunction = fn
}

/**
 * @internal
 * @deprecated this is an OLD API.
 * This function uses the SDK6 sendBatch to poll events from the renderer
 */
export async function pollEvents(sendBatch: (body: ManyEntityAction) => Promise<SendBatchResponse>) {
  const { events } = await sendBatch({ actions: [] })
  for (const e of events) {
    if (e.generic) {
      const data = JSON.parse(e.generic.eventData)
      switch (e.generic.eventId) {
        case 'onEnterScene': {
          onEnterSceneObservable.notifyObservers(data as IEvents['onEnterScene'])
          break
        }
        case 'onLeaveScene': {
          onLeaveSceneObservable.notifyObservers(data as IEvents['onLeaveScene'])
          break
        }
        case 'playerExpression': {
          onPlayerExpressionObservable.notifyObservers(data as IEvents['playerExpression'])
          break
        }
        case 'profileChanged': {
          onProfileChanged.notifyObservers(data as IEvents['profileChanged'])
          break
        }
        case 'playerConnected': {
          onPlayerConnectedObservable.notifyObservers(data as IEvents['playerConnected'])
          break
        }
        case 'playerDisconnected': {
          onPlayerDisconnectedObservable.notifyObservers(data as IEvents['playerDisconnected'])
          break
        }
        case 'onRealmChanged': {
          onRealmChangedObservable.notifyObservers(data as IEvents['onRealmChanged'])
          break
        }
        case 'playerClicked': {
          onPlayerClickedObservable.notifyObservers(data as IEvents['playerClicked'])
          break
        }
        case 'comms': {
          onCommsMessage.notifyObservers(data as IEvents['comms'])
          break
        }
      }
    }
  }
}

/**
 * @internal
 *
 * @returns the subscriber function
 */
function createSdk6FallbackSubscriber() {
  return (eventName: string) => {
    subscribeFunction({ eventId: eventName }).catch(console.error)
  }
}

/**
 * @internal
 *
 * @returns the subscriber function
 */
function createSdk7Subscriber() {
  let systemEnabled = false
  const enableProcessing: Record<IEventNames, boolean> = {
    onEnterScene: false,
    onLeaveScene: false,
    playerExpression: false,
    profileChanged: false,
    playerConnected: false,
    playerDisconnected: false,
    onRealmChanged: false,
    playerClicked: false,
    comms: false
  }

  function processLeaveEnterScene(dt: number) {
    // const transformUpdated = (Transform as any).getEntitiesChangedFromCrdt()
    // for (const [entityId, data] of engine.getEntitiesWith(PlayerIdentityData)) {
    //   if (transformUpdated.has(entityId)) {
    //     if (Transform.getOrNull(entityId) === null) {
    //     } else {
    //     }
    //   }
    // }
  }

  function system(dt: number) {
    // Quick exit if observables aren't being used at all
    if (!systemEnabled) return

    if (enableProcessing.onEnterScene || enableProcessing.onLeaveScene) {
      processLeaveEnterScene(dt)
    }
  }

  engine.addSystem(system, Number.MAX_VALUE)

  return (eventName: string) => {
    // If is a valid event name and hasn't been enabled yet
    if (eventName in enableProcessing && !enableProcessing[eventName as IEventNames]) {
      systemEnabled = true

      enableProcessing[eventName as IEventNames] = true
      switch (eventName) {
        case 'onEnterScene':
          break
        case 'onLeaveScene':
          break
        case 'playerExpression':
          break
        case 'profileChanged':
          break
        case 'playerConnected':
          break
        case 'playerDisconnected':
          break
        case 'onRealmChanged':
          break
        case 'playerClicked':
          break
        case 'comms':
          break
      }
    }
  }
}

/**
 * @internal
 */
function instanceSubscriberFunction() {
  const FORCE_SDK6_SUBSCRIBER = true

  // __SDK6_FALLBACK_SUPPORT should be exposed in the runtime
  const shouldFallbackSdk6 = FORCE_SDK6_SUBSCRIBER || (globalThis as any).__SDK6_FALLBACK_SUPPORT

  if (shouldFallbackSdk6) {
    return createSdk6FallbackSubscriber()
  } else {
    return createSdk7Subscriber()
  }
}
