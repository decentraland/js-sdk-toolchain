describe('player-click observable', () => {
  let addSystem: jest.Mock
  let getEntitiesWith: jest.Mock
  let observables: typeof import('../../packages/@dcl/sdk/src/observables')
  let observer: jest.Mock
  let onPointerEventsResultChange: jest.Mock

  beforeEach(() => {
    addSystem = jest.fn()
    getEntitiesWith = jest.fn()
    observer = jest.fn()
    onPointerEventsResultChange = jest.fn()

    jest.resetModules()
    jest.doMock(
      '@dcl/ecs',
      () => ({
        AvatarBase: { onChange: jest.fn() },
        AvatarEmoteCommand: { onChange: jest.fn() },
        AvatarEquippedData: { onChange: jest.fn() },
        PlayerIdentityData: { getOrNull: jest.fn() },
        PointerEventsResult: { onChange: onPointerEventsResultChange },
        RealmInfo: { onChange: jest.fn() },
        engine: {
          addSystem,
          getEntitiesWith,
          PlayerEntity: 1,
          removeSystem: jest.fn(),
          RootEntity: 0
        }
      }),
      { virtual: true }
    )
    jest.doMock('../../packages/@dcl/sdk/src/players', () => ({
      __esModule: true,
      default: { onEnterScene: jest.fn(), onLeaveScene: jest.fn() }
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

  describe('when a player joins after existing players have been scanned', () => {
    let playerClickSystem: () => void

    beforeEach(() => {
      getEntitiesWith.mockReturnValueOnce([[10], [20]]).mockReturnValueOnce([[10], [20], [30]])
      observables.onPlayerClickedObservable.add(observer)
      playerClickSystem = addSystem.mock.calls[1][0]
      playerClickSystem()
      playerClickSystem()
    })

    it('should subscribe to pointer results for the newly joined player', () => {
      expect(onPointerEventsResultChange).toHaveBeenCalledTimes(3)
    })
  })
})
