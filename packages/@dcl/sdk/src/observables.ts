import { Observable } from './internal/Observable'
import {
  AvatarBase,
  AvatarEmoteCommand,
  AvatarEquippedData,
  Entity,
  PlayerIdentityData,
  PointerEventsResult,
  RealmInfo,
  Vector3Type,
  engine
} from '@dcl/ecs'
import { ManyEntityAction, SendBatchResponse, subscribe } from '~system/EngineApi'
import players from './players'

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

  /**
   * This is triggered once the scene should start.
   */
  sceneStart: unknown

  /** This is triggered at least for each videoStatus change */
  videoEvent: {
    componentId: string
    videoClipId: string
    /** Status, can be NONE = 0, ERROR = 1, LOADING = 2, READY = 3, PLAYING = 4,BUFFERING = 5 */
    videoStatus: number
    /** Current offset position in seconds */
    currentOffset: number
    /** Video length in seconds. Can be -1 */
    totalVideoLength: number
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
 * @internal
 * This function generates a callback that is passed to the Observable
 * constructor to subscribe to the events of the DecentralandInterface
 */
function createSubscriber(eventName: keyof IEvents) {
  return () => {
    if (eventName === 'comms') {
      subscribe({ eventId: eventName }).catch(console.error)
    } else {
      SDK7ComponentsObservable?.subscribe(eventName)
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
 * This event is triggered after all the resources of the scene were loaded (models, textures, etc...)
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onSceneReadyObservable = new Observable<IEvents['sceneStart']>(createSubscriber('sceneStart'))

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
export const onVideoEvent = new Observable<IEvents['videoEvent']>(createSubscriber('videoEvent'))

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
 * @deprecated this is an OLD API.
 * This function uses the SDK6 sendBatch to poll events from the renderer
 */
export async function pollEvents(sendBatch: (body: ManyEntityAction) => Promise<SendBatchResponse>) {
  const { events } = await sendBatch({ actions: [] })
  for (const e of events) {
    if (e.generic) {
      const data = JSON.parse(e.generic.eventData)
      switch (e.generic.eventId) {
        case 'comms': {
          onCommsMessage.notifyObservers(data as IEvents['comms'])
          break
        }
      }
    }
  }
}

const SDK7ComponentsObservable = processObservables()
function processObservables() {
  const subscriptions = new Set<keyof IEvents>()

  function subscribe(eventName: keyof IEvents) {
    if (subscriptions.has(eventName)) return
    switch (eventName) {
      case 'playerClicked': {
        subscribePlayerClick()
      }
      case 'onEnterScene':
      case 'playerConnected': {
        subscribeEnterScene()
      }
      case 'onLeaveScene':
      case 'playerDisconnected': {
        subscribeLeaveScene()
      }
      case 'onRealmChanged': {
        subscribeRealmChange()
      }
      case 'playerExpression': {
        subscribePlayerExpression()
      }
      case 'profileChanged': {
        subscribeProfileChange()
      }
    }
    subscriptions.add(eventName)
  }
  /**
   * PLAYER ENTER/CONNECTED observable
   */
  function subscribeEnterScene() {
    players.onEnterScene((player) => {
      if (subscriptions.has('onEnterScene')) {
        onEnterSceneObservable.notifyObservers({ userId: player.userId })
      }

      if (subscriptions.has('playerConnected')) {
        onPlayerConnectedObservable.notifyObservers({ userId: player.userId })
      }
    })
  }
  /**
   * PLAYER LEAVE/DISCONNECTED observable
   */
  function subscribeLeaveScene() {
    players.onLeaveScene((userId) => {
      if (subscriptions.has('onLeaveScene')) {
        onLeaveSceneObservable.notifyObservers({ userId })
      }

      if (subscriptions.has('playerDisconnected')) {
        onPlayerDisconnectedObservable.notifyObservers({ userId })
      }
    })
  }
  /**
   * REALM CHANGE observable
   */
  function subscribeRealmChange() {
    RealmInfo.onChange(engine.RootEntity, (value) => {
      if (value) {
        onRealmChangedObservable.notifyObservers({
          domain: value.baseUrl,
          displayName: value.realmName,
          room: value.room ?? '',
          serverName: value.realmName
        })
      }
    })
  }
  /**
   * PLAYER/AVATAR CLICKED observable
   */
  function subscribePlayerClick() {
    const playerEntities = new Set<Entity>()
    engine.addSystem(() => {
      for (const [entity] of engine.getEntitiesWith(PlayerIdentityData)) {
        if (playerEntities.has(entity)) return
        playerEntities.add(entity)

        PointerEventsResult.onChange(entity, (data) => {
          if (data?.hit) {
            onPlayerClickedObservable.notifyObservers({
              userId: PlayerIdentityData.getOrNull(entity)?.address ?? '',
              ray: {
                direction: data.hit.direction!,
                distance: data.hit.length,
                origin: data.hit.globalOrigin!
              }
            })
          }
        })
      }
    })
  }

  /**
   * Player expression observable
   */
  function subscribePlayerExpression() {
    AvatarEmoteCommand.onChange(engine.PlayerEntity, (value) => {
      onPlayerExpressionObservable.notifyObservers({ expressionId: value?.emoteUrn ?? '' })
    })
  }

  /**
   * PROFILE CHANGE observable
   */
  function subscribeProfileChange() {
    AvatarBase.onChange(engine.PlayerEntity, () => {
      if (!profileAddress) return
      onProfileChanged.notifyObservers({ ethAddress: profileAddress, version: 0 })
    })

    AvatarEquippedData.onChange(engine.PlayerEntity, () => {
      if (!profileAddress) return
      onProfileChanged.notifyObservers({ ethAddress: profileAddress, version: 0 })
    })
  }

  // Flag to call once the scene is initalized.
  let sceneReady = false
  let profileAddress: string | undefined

  function observableSystem() {
    if (sceneReady && profileAddress) {
      return engine.removeSystem(observableSystem)
    }
    if (!sceneReady) {
      sceneReady = true
      onSceneReadyObservable.notifyObservers({})
    }
    if (profileAddress) return
    profileAddress = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address
  }

  engine.addSystem(observableSystem)

  return { subscribe }
}
