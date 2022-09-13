import { Observable } from './temp-fp/Observable'

/**
 * @internal
 * This function generates a callback that is passed to the Observable
 * constructor to subscribe to the events of the DecentralandInterface
 */
function createSubscriber(eventName: keyof IEvents) {
  return () => {
    if (typeof dcl !== 'undefined') dcl.subscribe(eventName)
  }
}

/**
 * These events are triggered after your character enters the scene.
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onEnterSceneObservable = new Observable<IEvents['onEnterScene']>(
  createSubscriber('onEnterScene')
)

/** @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed. Use onEnterSceneObservable instead. */
export const onEnterScene = onEnterSceneObservable

/**
 * These events are triggered after your character leaves the scene.
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onLeaveSceneObservable = new Observable<IEvents['onLeaveScene']>(
  createSubscriber('onLeaveScene')
)

/** @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed. Use onLeaveSceneObservable instead. */
export const onLeaveScene = onLeaveSceneObservable

/**
 * This event is triggered after all the resources of the scene were loaded (models, textures, etc...)
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onSceneReadyObservable = new Observable<IEvents['sceneStart']>(
  createSubscriber('sceneStart')
)

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onPlayerExpressionObservable = new Observable<
  IEvents['playerExpression']
>(createSubscriber('playerExpression'))

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onVideoEvent = new Observable<IEvents['videoEvent']>(
  createSubscriber('videoEvent')
)

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onProfileChanged = new Observable<IEvents['profileChanged']>(
  createSubscriber('profileChanged')
)

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onPlayerConnectedObservable = new Observable<
  IEvents['playerConnected']
>(createSubscriber('playerConnected'))

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onPlayerDisconnectedObservable = new Observable<
  IEvents['playerDisconnected']
>(createSubscriber('playerDisconnected'))

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onRealmChangedObservable = new Observable<
  IEvents['onRealmChanged']
>(createSubscriber('onRealmChanged'))

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
export const onPlayerClickedObservable = new Observable<
  IEvents['playerClicked']
>(createSubscriber('playerClicked'))

/**
 * @internal
 * This function adds _one_ listener to the onEvent event of dcl interface.
 * Leveraging a switch to route events to the Observable handlers.
 */
export function _initEventObservables() {
  if (typeof dcl !== 'undefined') {
    dcl.onEvent((event) => {
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
          onVideoEvent.notifyObservers(videoData)
          return
        }
        case 'profileChanged': {
          onProfileChanged.notifyObservers(
            event.data as IEvents['profileChanged']
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
        case 'playerClicked': {
          onPlayerClickedObservable.notifyObservers(
            event.data as IEvents['playerClicked']
          )
          return
        }
      }
    })
  }
}
