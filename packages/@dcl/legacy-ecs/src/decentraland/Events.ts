import { EventConstructor } from '../ecs/EventManager'
import { Observable } from '../ecs/Observable'
import { VideoTexture } from './Components'
import { DisposableComponent } from '../ecs/Component'

/**
 * @public
 */
@EventConstructor()
export class UUIDEvent<T = any> {
  constructor(public readonly uuid: string, public readonly payload: T) {}
}

/**
 * @public
 */
@EventConstructor()
export class RaycastResponse<T> {
  constructor(public readonly payload: RaycastResponsePayload<T>) {}
}

/**
 * @public
 */
@EventConstructor()
export class PointerEvent<GlobalInputEventResult> {
  constructor(public readonly payload: GlobalInputEventResult) {}
}

let internalDcl: DecentralandInterface | void

/**
 * @internal
 * This function generates a callback that is passed to the Observable
 * constructor to subscribe to the events of the DecentralandInterface
 */
function createSubscriber(eventName: keyof IEvents) {
  return () => {
    if (internalDcl) {
      internalDcl.subscribe(eventName)
    }
  }
}

/**
 * This event is triggered when you change your camera between 1st and 3rd person
 * @public
 */
export const onCameraModeChangedObservable = new Observable<
  IEvents['cameraModeChanged']
>(createSubscriber('cameraModeChanged'))

/**
 * This event is triggered when you change your camera between 1st and 3rd person
 * @public
 */
export const onIdleStateChangedObservable = new Observable<
  IEvents['idleStateChanged']
>(createSubscriber('idleStateChanged'))

/**
 * These events are triggered after your character enters the scene.
 * @public
 */
export const onEnterSceneObservable = new Observable<IEvents['onEnterScene']>(
  createSubscriber('onEnterScene')
)

/** @public @deprecated Use onEnterSceneObservable instead. */
export const onEnterScene = onEnterSceneObservable

/**
 * These events are triggered after your character leaves the scene.
 * @public
 */
export const onLeaveSceneObservable = new Observable<IEvents['onLeaveScene']>(
  createSubscriber('onLeaveScene')
)

/** @public @deprecated Use onLeaveSceneObservable instead. */
export const onLeaveScene = onLeaveSceneObservable

/**
 * This event is triggered after all the resources of the scene were loaded (models, textures, etc...)
 * @public
 */
export const onSceneReadyObservable = new Observable<IEvents['sceneStart']>(
  createSubscriber('sceneStart')
)

/**
 * @public
 */
export const onPlayerExpressionObservable = new Observable<
  IEvents['playerExpression']
>(createSubscriber('playerExpression'))

/**
 * @public
 */
export const onPointerLockedStateChange = new Observable<
  IEvents['onPointerLock']
>(createSubscriber('onPointerLock'))

/**
 * @public
 */
export const onVideoEvent = new Observable<IEvents['videoEvent']>(
  createSubscriber('videoEvent')
)

/**
 * @public
 */
export const onProfileChanged = new Observable<IEvents['profileChanged']>(
  createSubscriber('profileChanged')
)

/**
 * @public
 */
export const onPlayerConnectedObservable = new Observable<
  IEvents['playerConnected']
>(createSubscriber('playerConnected'))

/**
 * @public
 */
export const onPlayerDisconnectedObservable = new Observable<
  IEvents['playerDisconnected']
>(createSubscriber('playerDisconnected'))

/**
 * @public
 */
export const onRealmChangedObservable = new Observable<
  IEvents['onRealmChanged']
>(createSubscriber('onRealmChanged'))

/**
 * @internal
 * This function adds _one_ listener to the onEvent event of dcl interface.
 * Leveraging a switch to route events to the Observable handlers.
 */
export function _initEventObservables(dcl: DecentralandInterface) {
  // store internal reference to dcl, it is going to be used to subscribe to the events
  internalDcl = dcl

  if (internalDcl) {
    internalDcl.onEvent((event) => {
      switch (event.type) {
        case 'onEnterScene': {
          onEnterSceneObservable.notifyObservers(
            event.data as IEvents['onEnterScene']
          )
          return
        }
        case 'onLeaveScene': {
          onLeaveSceneObservable.notifyObservers(
            event.data as IEvents['onLeaveScene']
          )
          return
        }
        case 'cameraModeChanged': {
          onCameraModeChangedObservable.notifyObservers(
            event.data as IEvents['cameraModeChanged']
          )
          return
        }
        case 'idleStateChanged': {
          onIdleStateChangedObservable.notifyObservers(
            event.data as IEvents['idleStateChanged']
          )
          return
        }
        case 'sceneStart': {
          onSceneReadyObservable.notifyObservers(
            event.data as IEvents['sceneStart']
          )
          return
        }
        case 'playerExpression': {
          onPlayerExpressionObservable.notifyObservers(
            event.data as IEvents['playerExpression']
          )
          return
        }
        case 'videoEvent': {
          const videoData = event.data as IEvents['videoEvent']
          const component = DisposableComponent.engine.disposableComponents[
            videoData.componentId
          ] as VideoTexture
          if (component) {
            component.update(videoData)
          }
          onVideoEvent.notifyObservers(videoData)
          return
        }
        case 'profileChanged': {
          onProfileChanged.notifyObservers(
            event.data as IEvents['profileChanged']
          )
          return
        }
        case 'onPointerLock': {
          onPointerLockedStateChange.notifyObservers(
            event.data as IEvents['onPointerLock']
          )
          return
        }
        case 'playerConnected': {
          onPlayerConnectedObservable.notifyObservers(
            event.data as IEvents['playerConnected']
          )
          return
        }
        case 'playerDisconnected': {
          onPlayerDisconnectedObservable.notifyObservers(
            event.data as IEvents['playerDisconnected']
          )
          return
        }
        case 'onRealmChanged': {
          onRealmChangedObservable.notifyObservers(
            event.data as IEvents['onRealmChanged']
          )
          return
        }
      }
    })
  }
}
