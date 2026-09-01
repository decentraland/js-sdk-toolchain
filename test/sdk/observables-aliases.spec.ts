describe('SDK observables that share one underlying subscription', () => {
  let onEnterScene: jest.Mock
  let onLeaveScene: jest.Mock
  let observables: typeof import('../../packages/@dcl/sdk/src/observables')

  beforeEach(() => {
    onEnterScene = jest.fn()
    onLeaveScene = jest.fn()

    jest.resetModules()
    jest.doMock(
      '@dcl/ecs',
      () => ({
        AvatarBase: { onChange: jest.fn() },
        AvatarEmoteCommand: { onChange: jest.fn() },
        AvatarEquippedData: { onChange: jest.fn() },
        PlayerIdentityData: { getOrNull: jest.fn() },
        PointerEventsResult: { onChange: jest.fn() },
        RealmInfo: { onChange: jest.fn() },
        engine: {
          addSystem: jest.fn(),
          getEntitiesWith: jest.fn().mockReturnValue([]),
          PlayerEntity: 1,
          removeSystem: jest.fn(),
          RootEntity: 0
        }
      }),
      { virtual: true }
    )
    jest.doMock('../../packages/@dcl/sdk/src/players', () => ({
      __esModule: true,
      default: { onEnterScene, onLeaveScene }
    }))
    jest.doMock('~system/EngineApi', () => ({ subscribe: jest.fn() }))

    jest.isolateModules(() => {
      observables = jest.requireActual('../../packages/@dcl/sdk/src/observables')
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  /** The players helper calls every callback registered with it, not just one. */
  function emitEnterScene(userId: string) {
    for (const [callback] of onEnterScene.mock.calls) callback({ userId })
  }

  function emitLeaveScene(userId: string) {
    for (const [callback] of onLeaveScene.mock.calls) callback(userId)
  }

  describe('when observers are added to both enter-scene observables', () => {
    let enterSceneObserver: jest.Mock
    let playerConnectedObserver: jest.Mock

    beforeEach(() => {
      enterSceneObserver = jest.fn()
      playerConnectedObserver = jest.fn()
      observables.onEnterSceneObservable.add(enterSceneObserver)
      observables.onPlayerConnectedObservable.add(playerConnectedObserver)
    })

    it('should register a single player listener', () => {
      expect(onEnterScene).toHaveBeenCalledTimes(1)
    })

    it('should notify the enter-scene observer once per player', () => {
      emitEnterScene('0xtest')

      expect(enterSceneObserver).toHaveBeenCalledTimes(1)
    })

    it('should notify the player-connected observer once per player', () => {
      emitEnterScene('0xtest')

      expect(playerConnectedObserver).toHaveBeenCalledTimes(1)
    })
  })

  describe('when observers are added to both leave-scene observables', () => {
    let leaveSceneObserver: jest.Mock
    let playerDisconnectedObserver: jest.Mock

    beforeEach(() => {
      leaveSceneObserver = jest.fn()
      playerDisconnectedObserver = jest.fn()
      observables.onLeaveSceneObservable.add(leaveSceneObserver)
      observables.onPlayerDisconnectedObservable.add(playerDisconnectedObserver)
    })

    it('should register a single player listener', () => {
      expect(onLeaveScene).toHaveBeenCalledTimes(1)
    })

    it('should notify the leave-scene observer once per player', () => {
      emitLeaveScene('0xtest')

      expect(leaveSceneObserver).toHaveBeenCalledTimes(1)
    })

    it('should notify the player-disconnected observer once per player', () => {
      emitLeaveScene('0xtest')

      expect(playerDisconnectedObserver).toHaveBeenCalledTimes(1)
    })
  })

  describe('when an observer is added to only one of the two', () => {
    let playerConnectedObserver: jest.Mock

    beforeEach(() => {
      playerConnectedObserver = jest.fn()
      observables.onPlayerConnectedObservable.add(playerConnectedObserver)
    })

    it('should still notify it', () => {
      emitEnterScene('0xtest')

      expect(playerConnectedObserver).toHaveBeenCalledTimes(1)
    })
  })
})
