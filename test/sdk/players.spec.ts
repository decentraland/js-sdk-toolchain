import { Engine, IEngine } from '../../packages/@dcl/ecs/dist'
import * as components from '../../packages/@dcl/ecs/dist/components'

type PlayersModule = typeof import('../../packages/@dcl/sdk/src/players')

const LOCAL_ADDRESS = '0xlocal'
const REMOTE_ADDRESS = '0xremote'

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function loadPlayersModule(getSceneInformation: jest.Mock): PlayersModule {
  let mod: PlayersModule | undefined
  jest.isolateModules(() => {
    jest.doMock('~system/Runtime', () => ({ getSceneInformation }))
    mod = jest.requireActual('../../packages/@dcl/sdk/src/players')
  })
  return mod!
}

function sceneMetadata(base: string, parcels: string[]) {
  return { metadataJson: JSON.stringify({ scene: { base, parcels } }) }
}

describe('players helper', () => {
  let engine: IEngine
  let onEnter: jest.Mock
  let onLeave: jest.Mock

  function addPlayer(entity: ReturnType<IEngine['addEntity']>, address: string, x: number, z: number) {
    components.PlayerIdentityData(engine).createOrReplace(entity, { address, isGuest: false })
    components.AvatarBase(engine).createOrReplace(entity, {
      name: address,
      bodyShapeUrn: 'urn:decentraland:off-chain:base-avatars:BaseMale',
      skinColor: { r: 1, g: 1, b: 1 },
      eyesColor: { r: 1, g: 1, b: 1 },
      hairColor: { r: 1, g: 1, b: 1 }
    })
    components.Transform(engine).createOrReplace(entity, { position: { x, y: 0, z } })
  }

  function moveLocalPlayer(x: number, z: number) {
    components.Transform(engine).getMutable(engine.PlayerEntity).position = { x, y: 0, z }
  }

  async function setup(getSceneInformation: jest.Mock) {
    engine = Engine()
    onEnter = jest.fn()
    onLeave = jest.fn()
    const players = loadPlayersModule(getSceneInformation).definePlayerHelper(engine)
    players.onEnterScene(onEnter)
    players.onLeaveScene(onLeave)
    await flushPromises()
  }

  afterEach(() => {
    jest.resetModules()
  })

  describe('when the scene metadata lists its parcels', () => {
    beforeEach(async () => {
      await setup(jest.fn().mockResolvedValue(sceneMetadata('-5,3', ['-5,3', '-4,3'])))
    })

    it('should not fire onEnterScene while the local player is outside the scene', async () => {
      addPlayer(engine.PlayerEntity, LOCAL_ADDRESS, 40, 8)
      await engine.update(1)

      expect(onEnter).not.toHaveBeenCalled()
    })

    it('should fire onEnterScene when the local player walks in', async () => {
      addPlayer(engine.PlayerEntity, LOCAL_ADDRESS, 40, 8)
      await engine.update(1)
      moveLocalPlayer(20, 8)
      await engine.update(1)

      expect(onEnter).toHaveBeenCalledTimes(1)
      expect(onEnter.mock.calls[0][0].userId).toBe(LOCAL_ADDRESS)
    })

    it('should fire onLeaveScene when the local player walks out', async () => {
      addPlayer(engine.PlayerEntity, LOCAL_ADDRESS, 8, 8)
      await engine.update(1)
      moveLocalPlayer(8, -1)
      await engine.update(1)

      expect(onEnter).toHaveBeenCalledTimes(1)
      expect(onLeave).toHaveBeenCalledWith(LOCAL_ADDRESS)
    })

    it('should fire onEnterScene again when the local player comes back', async () => {
      addPlayer(engine.PlayerEntity, LOCAL_ADDRESS, 8, 8)
      await engine.update(1)
      moveLocalPlayer(-1, 8)
      await engine.update(1)
      moveLocalPlayer(8, 8)
      await engine.update(1)

      expect(onEnter).toHaveBeenCalledTimes(2)
      expect(onLeave).toHaveBeenCalledTimes(1)
    })

    it('should still fire onEnterScene for a remote player from its components', async () => {
      addPlayer(engine.addEntity(), REMOTE_ADDRESS, 400, 400)
      await engine.update(1)

      expect(onEnter).toHaveBeenCalledTimes(1)
      expect(onEnter.mock.calls[0][0].userId).toBe(REMOTE_ADDRESS)
    })
  })

  describe('when the scene parcels are still loading', () => {
    beforeEach(async () => {
      await setup(jest.fn().mockReturnValue(new Promise(() => {})))
    })

    it('should not fire onEnterScene for the local player', async () => {
      addPlayer(engine.PlayerEntity, LOCAL_ADDRESS, 8, 8)
      await engine.update(1)

      expect(onEnter).not.toHaveBeenCalled()
    })
  })

  describe.each`
    case                                     | getSceneInformation
    ${'the scene metadata has no parcels'}   | ${() => jest.fn().mockResolvedValue({ metadataJson: '{}' })}
    ${'the scene information request fails'} | ${() => jest.fn().mockRejectedValue(new Error('unavailable'))}
  `('when $case', ({ getSceneInformation }) => {
    beforeEach(async () => {
      await setup(getSceneInformation())
    })

    it('should fire onEnterScene for the local player from its components', async () => {
      addPlayer(engine.PlayerEntity, LOCAL_ADDRESS, 400, 400)
      await engine.update(1)

      expect(onEnter).toHaveBeenCalledTimes(1)
      expect(onEnter.mock.calls[0][0].userId).toBe(LOCAL_ADDRESS)
    })
  })
})
