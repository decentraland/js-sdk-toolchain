import { Engine } from '../../packages/@dcl/ecs/src/engine'
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
  onVideoEvent,
  onCommsMessage,
  pollEvents,
  setSubscribeFunction
} from '../../packages/@dcl/sdk/src/observables'
import { createRendererTransport } from '../../packages/@dcl/sdk/src/internal/transports/rendererTransport'
import { SendBatchResponse } from '~system/EngineApi'

describe('Observable tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  it('should avoid echo messages', async () => {
    const crdtSendToRenderer = jest.fn()
    const rendererTransport = createRendererTransport({ crdtSendToRenderer })
    const engine = Engine()
    engine.addTransport(rendererTransport)

    const eventToEmit = [
      { eventId: 'onEnterScene', eventData: '{}' },
      { eventId: 'onLeaveScene', eventData: '{}' },
      { eventId: 'sceneStart', eventData: '{}' },
      { eventId: 'playerExpression', eventData: '{}' },
      { eventId: 'videoEvent', eventData: '{}' },
      { eventId: 'profileChanged', eventData: '{}' },
      { eventId: 'playerConnected', eventData: '{}' },
      { eventId: 'playerDisconnected', eventData: '{}' },
      { eventId: 'onRealmChanged', eventData: '{}' },
      { eventId: 'playerClicked', eventData: '{}' },
      { eventId: 'comms', eventData: '{}' }
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
      onPlayerClickedObservable: 0,
      onCommsMessage: 0
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
    onCommsMessage.add(() => {
      counter.onCommsMessage++
    })
    let counterSubscribe = 0
    setSubscribeFunction(async () => {
      counterSubscribe++
    })
    onRealmChangedObservable.add(() => {
      counter.onRealmChangedObservable++
    })
    onPlayerClickedObservable.add(() => {
      counter.onPlayerClickedObservable++
    })

    await pollEvents(
      async (): Promise<SendBatchResponse> => ({
        events: eventToEmit.map(($) => ({ type: 0 /*generic*/, generic: $ }))
      })
    )

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
    expect(counter.onCommsMessage).toBe(1)
    expect(counterSubscribe).toBe(2)
  })
})
