describe('SDK observables', () => {
  let addSystem: jest.Mock
  let onAvatarBaseChange: jest.Mock
  let onAvatarEquippedDataChange: jest.Mock
  let onAvatarEmoteCommandChange: jest.Mock
  let onEnterScene: jest.Mock
  let onLeaveScene: jest.Mock
  let onPointerEventsResultChange: jest.Mock
  let onRealmInfoChange: jest.Mock
  let observables: typeof import('../../packages/@dcl/sdk/src/observables')
  let observer: jest.Mock

  beforeEach(() => {
    addSystem = jest.fn()
    onAvatarBaseChange = jest.fn()
    onAvatarEquippedDataChange = jest.fn()
    onAvatarEmoteCommandChange = jest.fn()
    onEnterScene = jest.fn()
    onLeaveScene = jest.fn()
    onPointerEventsResultChange = jest.fn()
    onRealmInfoChange = jest.fn()
    observer = jest.fn()

    jest.resetModules()
    jest.doMock(
      '@dcl/ecs',
      () => ({
        AvatarBase: { onChange: onAvatarBaseChange },
        AvatarEmoteCommand: { onChange: onAvatarEmoteCommandChange },
        AvatarEquippedData: { onChange: onAvatarEquippedDataChange },
        PlayerIdentityData: { getOrNull: jest.fn() },
        PointerEventsResult: { onChange: onPointerEventsResultChange },
        RealmInfo: { onChange: onRealmInfoChange },
        engine: {
          addSystem,
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

  describe('when an enter-scene observer is added', () => {
    it('should only initialize the enter-scene component subscription', () => {
      observables.onEnterSceneObservable.add(observer)

      expect([
        onEnterScene.mock.calls.length,
        onLeaveScene.mock.calls.length,
        onRealmInfoChange.mock.calls.length,
        onAvatarEmoteCommandChange.mock.calls.length,
        onAvatarBaseChange.mock.calls.length,
        onAvatarEquippedDataChange.mock.calls.length
      ]).toEqual([1, 0, 0, 0, 0, 0])
    })
  })
})
