import { Observable } from './internal/Observable'
import { QuaternionType, Vector3Type } from '@dcl/ecs'
import { ManyEntityAction, SendBatchResponse, subscribe } from '~system/EngineApi'

let subscribeFunction: typeof subscribe = subscribe

/** @public */
export type InputEventResult = {
  /** Origin of the ray, relative to the scene */
  origin: Vector3Type
  /** Direction vector of the ray (normalized) */
  direction: Vector3Type
  /** ID of the pointer that triggered the event */
  buttonId: number
  /** Does this pointer event hit any object? */
  hit?: {
    /** Length of the ray */
    length: number
    /** If the ray hits a mesh the intersection point will be this */
    hitPoint: Vector3Type
    /** If the mesh has a name, it will be assigned to meshName */
    meshName: string
    /** Normal of the hit */
    normal: Vector3Type
    /** Normal of the hit, in world space */
    worldNormal: Vector3Type
    /** Hit entity ID if any */
    entityId: unknown
  }
}

/** @public */
export type GlobalInputEventResult = InputEventResult & {
  /**
   * DOWN = 0,
   * UP = 1
   */
  type: 0 | 1
}

/** @public */
export type RaycastResponsePayload<T> = {
  queryId: string
  queryType: string
  payload: T
}

/** @public */
export type GizmoDragEndEvent = {
  type: 'gizmoDragEnded'
  transforms: Array<{
    position: Vector3Type
    rotation: QuaternionType
    scale: Vector3Type
    entityId: unknown
  }>
}

/** @public */
export type GizmoSelectedEvent = {
  type: 'gizmoSelected'
  gizmoType: 'MOVE' | 'ROTATE' | 'SCALE' | 'NONE'
  entities: string[]
}

/// --- EVENTS ---

/** @public */
export type IEventNames = keyof IEvents

/** @public */
export type EngineEvent<T extends IEventNames = IEventNames, V = IEvents[T]> = {
  /** eventName */
  type: T
  data: Readonly<V>
}

/**
 * @public
 * Note: Don't use `on` prefix for IEvents to avoid redundancy with `event.on("onEventName")` syntax.
 */
export interface IEvents {
  /**
   * `positionChanged` is triggered when the position of the camera changes
   * This event is throttled to 10 times per second.
   */
  positionChanged: {
    /** Camera position relative to the base parcel of the scene */
    position: Vector3Type

    /** Camera position, this is a absolute world position */
    cameraPosition: Vector3Type

    /** Eye height, in meters. */
    playerHeight: number
  }

  /**
   * `rotationChanged` is triggered when the rotation of the camera changes.
   * This event is throttled to 10 times per second.
   */
  rotationChanged: {
    /** Degree vector. Same as entities */
    rotation: Vector3Type
    /** Rotation quaternion, useful in some scenarios. */
    quaternion: QuaternionType
  }

  /**
   * `cameraModeChanged` is triggered when the user changes the camera mode
   */
  cameraModeChanged: {
    /**
     * FIRST_PERSON = 0,
     * THIRD_PERSON = 1,
     * FREE_CAMERA = 2
     */
    cameraMode: 0 | 1 | 2
  }

  /**
   * `idleStateChanged` is triggered when the user not moves for a defined period of time
   */
  idleStateChanged: {
    isIdle: boolean
  }

  playerExpression: {
    expressionId: string
  }

  /**
   * `pointerUp` is triggered when the user releases an input pointer.
   * It could be a VR controller, a touch screen or the mouse.
   */
  pointerUp: InputEventResult

  /**
   * `pointerDown` is triggered when the user press an input pointer.
   * It could be a VR controller, a touch screen or the mouse.
   */
  pointerDown: InputEventResult

  /**
   * `pointerEvent` is triggered when the user press or releases an input pointer.
   * It could be a VR controller, a touch screen or the mouse.
   *
   * @deprecated use actionButtonEvent instead
   */
  pointerEvent: GlobalInputEventResult

  /**
   * `actionButtonEvent` is triggered when the user press or releases an input pointer.
   * It could be a VR controller, a touch screen or the mouse.
   *
   * This event is exactly the same as `pointerEvent` but the logic in the ECS had an unsolvable
   * condition that required us to create this new event to handle more cases for new buttons.
   */
  actionButtonEvent: GlobalInputEventResult

  /**
   * `raycastResponse` is triggered in response to a raycast query
   */
  raycastResponse: RaycastResponsePayload<any>

  /**
   * `chatMessage` is triggered when the user sends a message through chat entity.
   */
  chatMessage: {
    id: string
    sender: string
    message: string
    isCommand: boolean
  }

  /**
   * `onChange` is triggered when an entity changes its own internal state.
   * Dispatched by the `ui-*` entities when their value is changed. It triggers a callback.
   * Notice: Only entities with ID will be listening for click events.
   */
  onChange: {
    value?: any
    /** ID of the pointer that triggered the event */
    pointerId?: number
  }

  /**
   * `onEnter` is triggered when the user hits the "Enter" key from the keyboard
   * Used principally by the Chat internal scene
   */
  onEnter: unknown

  /**
   * `onPointerLock` is triggered when the user clicks the world canvas and the
   * pointer locks to it so the pointer moves the camera
   */
  onPointerLock: {
    locked?: boolean
  }

  /**
   * `onAnimationEnd` is triggered when an animation clip gets finish
   */
  onAnimationEnd: {
    clipName: string
  }

  /**
   * `onFocus` is triggered when an entity focus is active.
   * Dispatched by the `ui-input` and `ui-password` entities when the value is changed.
   * It triggers a callback.
   *
   * Notice: Only entities with ID will be listening for click events.
   */
  onFocus: {
    /** ID of the entitiy of the event */
    entityId: unknown
    /** ID of the pointer that triggered the event */
    pointerId: number
  }

  /**
   * `onBlur` is triggered when an entity loses its focus.
   * Dispatched by the `ui-input` and `ui-password` entities when the value is changed.
   *  It triggers a callback.
   *
   * Notice: Only entities with ID will be listening for click events.
   */
  onBlur: {
    /** ID of the entitiy of the event */
    entityId: unknown
    /** ID of the pointer that triggered the event */
    pointerId: number
  }

  /** The onClick event is only used for UI elements */
  onClick: {
    entityId: unknown
  }

  /**
   * This event gets triggered when an entity leaves the scene fences.
   */
  entityOutOfScene: {
    entityId: unknown
  }

  /**
   * This event gets triggered when an entity enters the scene fences.
   */
  entityBackInScene: {
    entityId: unknown
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

  /**
   * This is triggered once the builder scene is loaded.
   */
  builderSceneStart: unknown

  /**
   * This is triggered once the builder scene is unloaded.
   */
  builderSceneUnloaded: unknown

  /**
   * After checking entities outside the fences, if any is outside, this event
   * will be triggered with all the entities outside the scene.
   */
  entitiesOutOfBoundaries: {
    entities: string[]
  }

  uuidEvent: {
    uuid: string
    payload: any
  }

  onTextSubmit: {
    text: string
  }

  metricsUpdate: {
    given: Record<string, number>
    limit: Record<string, number>
  }

  limitsExceeded: {
    given: Record<string, number>
    limit: Record<string, number>
  }

  /** For gizmos */
  gizmoEvent: GizmoDragEndEvent | GizmoSelectedEvent

  externalAction: {
    type: string
    [key: string]: any
  }

  stateEvent: {
    type: string
    payload: any
  }

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

  /** Triggered when pointer start hovering an entities' shape */
  pointerHoverEnter: unknown

  /** Triggered when pointer stop hovering an entities' shape */
  pointerHoverExit: unknown
}

/**
 * @internal
 * This function generates a callback that is passed to the Observable
 * constructor to subscribe to the events of the DecentralandInterface
 */
function createSubscriber(eventName: string) {
  return () => {
    subscribeFunction({ eventId: eventName }).catch(console.error)
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
        case 'sceneStart': {
          onSceneReadyObservable.notifyObservers(data as IEvents['sceneStart'])
          break
        }
        case 'playerExpression': {
          onPlayerExpressionObservable.notifyObservers(data as IEvents['playerExpression'])
          break
        }
        case 'videoEvent': {
          const videoData = data as IEvents['videoEvent']
          onVideoEvent.notifyObservers(videoData)
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
