import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { initializeDcl } from '../../packages/@dcl/ecs/src/runtime/initialization/dcl'
import {
  onEnterSceneObservable,
  onLeaveSceneObservable,
  onPlayerClickedObservable,
  onPlayerConnectedObservable,
  onPlayerDisconnectedObservable,
  onPlayerExpressionObservable,
  onProfileChanged,
  onRealmChangedObservable,
  onSceneReadyObservable,
  onVideoEvent
} from '../../packages/@dcl/ecs/src/runtime/observables'
import { createNetworkTransport } from '../../packages/@dcl/ecs/src/systems/crdt/transports/networkTransport'
import { setupDclInterfaceForThisSuite, testingEngineApi } from './utils'
import { createRendererTransport } from '../../packages/@dcl/ecs/src/systems/crdt/transports/rendererTransport'

describe('`dcl` object not declared', () => {
  it('should failed if there is no dcl', () => {
    const networkTransport = createNetworkTransport()
    const engine = Engine({ transports: [networkTransport] })
    const obj = initializeDcl(engine)
    expect(typeof obj.error).toBe('function')
    expect(typeof obj.log).toBe('function')

    obj.log() // do nothing
  })
})

describe('Observable tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  const engineApi = testingEngineApi()
  const mockedDcl = setupDclInterfaceForThisSuite({
    ...engineApi.modules
  })

  it('should avoid echo messages', () => {
    const rendererTransport = createRendererTransport()
    const engine = Engine({ transports: [rendererTransport] })
    initializeDcl(engine)

    const eventToEmit = [
      { type: 'onEnterScene', data: {} },
      { type: 'onLeaveScene', data: {} },
      { type: 'sceneStart', data: {} },
      { type: 'playerExpression', data: {} },
      { type: 'videoEvent', data: {} },
      { type: 'profileChanged', data: {} },
      { type: 'playerConnected', data: {} },
      { type: 'playerDisconnected', data: {} },
      { type: 'onRealmChanged', data: {} },
      { type: 'playerClicked', data: {} }
    ]
    const counter = {
      onEnterSceneObservable: 0,
      onLeaveSceneObservable: 0,
      onSceneReadyObservable: 0,
      onPlayerExpressionObservable: 0,
      onVideoEvent: 0,
      onProfileChanged: 0,
      onPlayerConnectedObservable: 0,
      onPlayerDisconnectedObservable: 0,
      onRealmChangedObservable: 0,
      onPlayerClickedObservable: 0
    }
    onEnterSceneObservable.add(() => {
      counter.onEnterSceneObservable++
    })
    onLeaveSceneObservable.add(() => {
      counter.onLeaveSceneObservable++
    })
    onSceneReadyObservable.add(() => {
      counter.onSceneReadyObservable++
    })
    onPlayerExpressionObservable.add(() => {
      counter.onPlayerExpressionObservable++
    })
    onVideoEvent.add(() => {
      counter.onVideoEvent++
    })
    onProfileChanged.add(() => {
      counter.onProfileChanged++
    })
    onPlayerConnectedObservable.add(() => {
      counter.onPlayerConnectedObservable++
    })
    onPlayerDisconnectedObservable.add(() => {
      counter.onPlayerDisconnectedObservable++
    })
    onRealmChangedObservable.add(() => {
      counter.onRealmChangedObservable++
    })
    onPlayerClickedObservable.add(() => {
      counter.onPlayerClickedObservable++
    })

    mockedDcl.eventFns.forEach((cb) => {
      for (const e of eventToEmit) {
        cb(e)
      }
    })

    expect(counter.onEnterSceneObservable).toBe(1)
    expect(counter.onLeaveSceneObservable).toBe(1)
    expect(counter.onSceneReadyObservable).toBe(1)
    expect(counter.onPlayerExpressionObservable).toBe(1)
    expect(counter.onVideoEvent).toBe(1)
    expect(counter.onProfileChanged).toBe(1)
    expect(counter.onPlayerConnectedObservable).toBe(1)
    expect(counter.onPlayerDisconnectedObservable).toBe(1)
    expect(counter.onRealmChangedObservable).toBe(1)
    expect(counter.onPlayerClickedObservable).toBe(1)
  })
})
