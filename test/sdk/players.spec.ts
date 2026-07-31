import { Engine, Entity, IEngine } from '../../packages/@dcl/ecs/dist'
import {
  PlayerIdentityData as definePlayerIdentityData,
  AvatarBase as defineAvatarBase
} from '../../packages/@dcl/ecs/dist/components'
import { GetPlayerDataRes, PlayerSnapshot, definePlayerHelper } from '../../packages/@dcl/sdk/src/players'

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

describe('Players helper', () => {
  let engine: IEngine
  let PlayerIdentityData: ReturnType<typeof definePlayerIdentityData>
  let AvatarBase: ReturnType<typeof defineAvatarBase>
  let players: ReturnType<typeof definePlayerHelper>
  let addIdentity: (address: string, isGuest?: boolean) => Entity
  let setAvatarName: (entity: Entity, name: string) => void

  beforeEach(() => {
    engine = Engine()
    PlayerIdentityData = definePlayerIdentityData(engine)
    AvatarBase = defineAvatarBase(engine)
    players = definePlayerHelper(engine)
    // AvatarBase is a protobuf component: every field must be present for it to
    // serialize, so build it from the schema defaults and only override the name.
    setAvatarName = (entity: Entity, name: string) => {
      if (!AvatarBase.has(entity)) AvatarBase.create(entity)
      AvatarBase.getMutable(entity).name = name
    }
    addIdentity = (address: string, isGuest = false) => {
      const entity = engine.addEntity()
      PlayerIdentityData.create(entity, { address, isGuest })
      return entity
    }
  })

  describe('when only the identity of a player is present', () => {
    let room: GetPlayerDataRes[]
    let scene: GetPlayerDataRes[]

    beforeEach(async () => {
      room = []
      scene = []
      players.onEnterScene((player) => room.push(player), { requireProfile: false })
      players.onEnterScene((player) => scene.push(player))
      addIdentity('0xABCDEF0123456789')
      await engine.update(1)
    })

    it('should report the arrival on the identity threshold', () => {
      expect(room.map((player) => player.userId)).toEqual(['0xABCDEF0123456789'])
    })

    it('should not report it on the default threshold', () => {
      expect(scene).toEqual([])
    })

    it('should leave the profile name empty', () => {
      expect(room[0].name).toBe('')
    })

    it('should still offer a renderable display name', () => {
      expect(room[0].displayName).toBe('0xABCDEF')
    })

    it('should mark the name as unresolved', () => {
      expect(room[0].nameResolved).toBe(false)
    })

    it('should count the player as present', () => {
      expect(players.getPlayerCount()).toBe(1)
    })
  })

  describe('when the avatar profile arrives after the identity', () => {
    let scene: GetPlayerDataRes[]
    let renamed: string[]
    let entity: Entity

    beforeEach(async () => {
      scene = []
      renamed = []
      players.onEnterScene((player) => scene.push(player))
      players.onPlayerNameChanged((player) => renamed.push(player.name))
      entity = addIdentity('0xaaa1')
      await engine.update(1)
      setAvatarName(entity, 'Ada')
      await engine.update(1)
    })

    it('should report the player as entering the scene', () => {
      expect(scene).toHaveLength(1)
    })

    it('should give the scene handler a populated name', () => {
      expect(scene[0].name).toBe('Ada')
    })

    it('should report the resolved name once', () => {
      expect(renamed).toEqual(['Ada'])
    })

    it('should return the resolved name for any address casing', () => {
      expect(players.getPlayer({ userId: '0xAAA1' })?.displayName).toBe('Ada')
    })
  })

  describe('when a resolved profile name becomes empty again', () => {
    let renamed: string[]
    let entity: Entity

    beforeEach(async () => {
      renamed = []
      entity = addIdentity('0xaaa2')
      setAvatarName(entity, 'Ada')
      players.onPlayerNameChanged((player) => renamed.push(player.name))
      await engine.update(1)
      setAvatarName(entity, '')
      await engine.update(1)
    })

    it('should keep the previously resolved name', () => {
      expect(players.getPlayer({ userId: '0xaaa2' })?.displayName).toBe('Ada')
    })

    it('should not report a name change', () => {
      expect(renamed).toEqual([])
    })
  })

  describe('when a profile name looks like a hex address prefix', () => {
    let entity: Entity

    beforeEach(async () => {
      entity = addIdentity('0xaaa3')
      setAvatarName(entity, '0xDeadBeefGamer')
      await engine.update(1)
    })

    it('should accept it as a real name', () => {
      expect(players.getPlayer({ userId: '0xaaa3' })?.displayName).toBe('0xDeadBeefGamer')
    })

    it('should mark the name as resolved', () => {
      expect(players.getPlayer({ userId: '0xaaa3' })?.nameResolved).toBe(true)
    })
  })

  describe('when a profile name is just the address echoed back', () => {
    let entity: Entity

    beforeEach(async () => {
      entity = addIdentity('0xAAA4')
      setAvatarName(entity, '0xaaa4')
      await engine.update(1)
    })

    it('should treat the name as unresolved', () => {
      expect(players.getPlayer({ userId: '0xaaa4' })?.nameResolved).toBe(false)
    })
  })

  describe('when the avatar profile goes away but the identity stays', () => {
    let leftScene: string[]
    let leftRoom: string[]
    let entity: Entity

    beforeEach(async () => {
      leftScene = []
      leftRoom = []
      players.onLeaveScene((userId) => leftScene.push(userId))
      players.onLeaveScene((userId) => leftRoom.push(userId), { requireProfile: false })
      entity = addIdentity('0xaaa5')
      setAvatarName(entity, 'Ada')
      await engine.update(1)
      AvatarBase.deleteFrom(entity)
      await engine.update(1)
    })

    it('should report the player as leaving the scene', () => {
      expect(leftScene).toEqual(['0xaaa5'])
    })

    it('should not report a leave on the identity threshold', () => {
      expect(leftRoom).toEqual([])
    })
  })

  describe('when the identity of a player in the scene goes away', () => {
    let leftScene: string[]
    let leftRoom: PlayerSnapshot[]
    let entity: Entity

    beforeEach(async () => {
      leftScene = []
      leftRoom = []
      players.onLeaveScene((userId) => leftScene.push(userId))
      players.onLeaveScene((_userId, last) => leftRoom.push(last), { requireProfile: false })
      entity = addIdentity('0xaaa6')
      setAvatarName(entity, 'Ada')
      await engine.update(1)
      engine.removeEntity(entity)
      await engine.update(1)
    })

    it('should report the player as leaving the scene', () => {
      expect(leftScene).toEqual(['0xaaa6'])
    })

    it('should report the leave on the identity threshold', () => {
      expect(leftRoom.map((player) => player.userId)).toEqual(['0xaaa6'])
    })

    it('should carry the last known name in the snapshot', () => {
      expect(leftRoom[0].name).toBe('Ada')
    })

    it('should no longer consider the player present', () => {
      expect(players.getPlayer({ userId: '0xaaa6' })).toBeNull()
    })
  })

  describe('when one player leaves and another joins on the same tick', () => {
    let joined: string[]
    let left: string[]
    let countDuringJoin: number
    let leaving: Entity

    beforeEach(async () => {
      joined = []
      left = []
      countDuringJoin = -1
      players.onEnterScene(
        (player) => {
          joined.push(player.userId)
          countDuringJoin = players.getPlayerCount()
        },
        { requireProfile: false }
      )
      players.onLeaveScene((userId) => left.push(userId), { requireProfile: false })
      leaving = addIdentity('0xleaving')
      await engine.update(1)
      engine.removeEntity(leaving)
      addIdentity('0xjoining')
      await engine.update(1)
    })

    it('should report the joining player', () => {
      expect(joined).toEqual(['0xleaving', '0xjoining'])
    })

    it('should report the leaving player', () => {
      expect(left).toEqual(['0xleaving'])
    })

    it('should expose a consistent count inside the join handler', () => {
      expect(countDuringJoin).toBe(1)
    })
  })

  describe('when two entities carry the same address and only the newer has a profile', () => {
    let stale: Entity
    let fresh: Entity

    beforeEach(async () => {
      stale = addIdentity('0xdupe')
      fresh = addIdentity('0xdupe')
      setAvatarName(fresh, 'RealName')
      await engine.update(1)
    })

    it('should resolve the name from the entity that has one', () => {
      expect(players.getPlayer({ userId: '0xdupe' })?.displayName).toBe('RealName')
    })

    it('should track the entity that has the profile', () => {
      expect(players.getPlayer({ userId: '0xdupe' })?.entity).toBe(fresh)
    })

    it('should report the player only once', () => {
      expect(players.getPlayerCount()).toBe(1)
    })

    it('should expose the profile through the tracked entity', () => {
      expect(players.getPlayer({ userId: '0xdupe' })?.nameResolved).toBe(true)
    })
  })

  describe('when the guest flag changes after the player joined', () => {
    let entity: Entity

    beforeEach(async () => {
      entity = addIdentity('0xaaa7', false)
      await engine.update(1)
      PlayerIdentityData.getMutable(entity).isGuest = true
      await engine.update(1)
    })

    it('should reflect the updated guest flag', () => {
      expect(players.getPlayer({ userId: '0xaaa7' })?.isGuest).toBe(true)
    })
  })

  describe('when a handler unsubscribes', () => {
    let seen: string[]
    let unsubscribe: () => void

    beforeEach(async () => {
      seen = []
      unsubscribe = players.onEnterScene((player) => seen.push(player.userId), { requireProfile: false })
      addIdentity('0xfirst')
      await engine.update(1)
      unsubscribe()
      addIdentity('0xsecond')
      await engine.update(1)
    })

    it('should stop receiving events', () => {
      expect(seen).toEqual(['0xfirst'])
    })
  })

  describe('when a handler is registered after players joined', () => {
    let byDefault: string[]
    let optedOut: string[]

    beforeEach(async () => {
      byDefault = []
      optedOut = []
      addIdentity('0xearly')
      await engine.update(1)
      players.onEnterScene((player) => byDefault.push(player.userId), { requireProfile: false })
      players.onEnterScene((player) => optedOut.push(player.userId), {
        requireProfile: false,
        replayPresent: false
      })
    })

    it('should replay players already present by default', () => {
      expect(byDefault).toEqual(['0xearly'])
    })

    it('should skip the replay when opted out', () => {
      expect(optedOut).toEqual([])
    })
  })

  describe('and the replay is requested on the default threshold', () => {
    let replayed: string[]
    let withoutProfile: Entity

    beforeEach(async () => {
      replayed = []
      const named = addIdentity('0xnamed')
      setAvatarName(named, 'Ada')
      withoutProfile = addIdentity('0xbare')
      await engine.update(1)
      players.onEnterScene((player) => replayed.push(player.userId))
    })

    it('should replay only the players that satisfy the threshold', () => {
      expect(replayed).toEqual(['0xnamed'])
    })
  })

  describe('when a handler subscribes from inside an arrival callback', () => {
    let late: string[]

    beforeEach(async () => {
      late = []
      // Subscribes exactly once. Note `stop()` would NOT do: unsubscribing mid-pass does not
      // retroactively remove the handler from the snapshot this tick is delivering to.
      let subscribed = false
      players.onEnterScene(
        () => {
          if (subscribed) return
          subscribed = true
          players.onEnterScene((player) => late.push(player.userId), { requireProfile: false })
        },
        { requireProfile: false }
      )
      addIdentity('0xa')
      addIdentity('0xb')
      await engine.update(1)
    })

    it('should replay every player present at that moment', () => {
      expect([...late].sort()).toEqual(['0xa', '0xb'])
    })

    it('should deliver each of them exactly once', () => {
      expect(late).toHaveLength(new Set(late).size)
    })

    describe('and further ticks pass', () => {
      beforeEach(async () => {
        await engine.update(1)
      })

      it('should not deliver them again', () => {
        expect([...late].sort()).toEqual(['0xa', '0xb'])
      })
    })
  })

  describe('when a player profile name has surrounding whitespace', () => {
    let snapshot: PlayerSnapshot
    let liveName: string
    let entity: Entity

    beforeEach(async () => {
      players.onLeaveScene((_userId, lastKnown) => (snapshot = lastKnown), { requireProfile: false })
      entity = addIdentity('0xpadded')
      setAvatarName(entity, '  Ada  ')
      await engine.update(1)
      liveName = players.getPlayer({ userId: '0xpadded' })!.name
      engine.removeEntity(entity)
      await engine.update(1)
    })

    it('should report the same raw name in the snapshot as in the live payload', () => {
      expect(snapshot.name).toBe(liveName)
    })

    it('should trim it for the display name', () => {
      expect(snapshot.displayName).toBe('Ada')
    })
  })

  describe('when a handler throws', () => {
    let reached: string[]
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(async () => {
      reached = []
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      players.onEnterScene(
        () => {
          throw new Error('handler blew up')
        },
        { requireProfile: false }
      )
      players.onEnterScene((player) => reached.push(player.userId), { requireProfile: false })
      addIdentity('0xaaa8')
      await engine.update(1)
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should still run the remaining handlers', () => {
      expect(reached).toEqual(['0xaaa8'])
    })

    describe('and a later tick brings another player', () => {
      beforeEach(async () => {
        addIdentity('0xaaa9')
        await engine.update(1)
      })

      it('should keep tracking', () => {
        expect(reached).toEqual(['0xaaa8', '0xaaa9'])
      })
    })
  })

  describe('when looking up a player by a differently cased address', () => {
    beforeEach(async () => {
      addIdentity('0xAbCdEf0123456789')
      await engine.update(1)
    })

    it('should find them with getPlayer', () => {
      expect(players.getPlayer({ userId: '0xabcdef0123456789' })?.userId).toBe('0xAbCdEf0123456789')
    })

    it('should find them with an upper-cased address', () => {
      expect(players.getPlayer({ userId: '0XABCDEF0123456789' })).not.toBeNull()
    })
  })

  describe('when the helper is requested twice for the same engine', () => {
    let second: ReturnType<typeof definePlayerHelper>

    beforeEach(() => {
      second = definePlayerHelper(engine)
    })

    it('should return the same instance', () => {
      expect(second).toBe(players)
    })
  })

  describe('when a subscriber registers after the shared tracker already saw a player', () => {
    let caught: string[]
    let shared: ReturnType<typeof definePlayerHelper>

    beforeEach(async () => {
      caught = []
      addIdentity('0xalready')
      await engine.update(1)
      // A second consumer of the SAME engine — the shape message-bus-sync uses.
      shared = definePlayerHelper(engine)
      shared.onEnterScene((player) => caught.push(player.userId), {
        requireProfile: false,
        replayPresent: true
      })
    })

    it('should still deliver the already-present player', () => {
      expect(caught).toEqual(['0xalready'])
    })
  })

  describe('when a player has an avatar component but an unusable name', () => {
    let scene: GetPlayerDataRes[]
    let entity: Entity

    beforeEach(async () => {
      scene = []
      players.onEnterScene((player) => scene.push(player))
      entity = addIdentity('0xemptyname')
      setAvatarName(entity, '')
      await engine.update(1)
    })

    it('should fire on the default threshold anyway', () => {
      expect(scene).toHaveLength(1)
    })

    it('should expose an empty raw name', () => {
      expect(scene[0].name).toBe('')
    })

    it('should still expose a renderable display name', () => {
      expect(scene[0].displayName).toBe('0xemptyn')
    })
  })

  describe('when an async handler rejects on arrival', () => {
    let reached: string[]
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(async () => {
      reached = []
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      players.onEnterScene(
        async () => {
          await Promise.resolve()
          throw new Error('async arrival blew up')
        },
        { requireProfile: false }
      )
      players.onEnterScene((player) => reached.push(player.userId), { requireProfile: false })
      addIdentity('0xasync1')
      await engine.update(1)
      await flushMicrotasks()
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should still run the remaining handlers', () => {
      expect(reached).toEqual(['0xasync1'])
    })

    it('should log the rejection instead of leaving it unhandled', () => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('[players] onEnterScene handler failed:', expect.any(Error))
    })
  })

  describe('when an async handler rejects on departure', () => {
    let consoleErrorSpy: jest.SpyInstance
    let entity: Entity

    beforeEach(async () => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      players.onLeaveScene(
        async () => {
          await Promise.resolve()
          throw new Error('async departure blew up')
        },
        { requireProfile: false }
      )
      entity = addIdentity('0xasync2')
      await engine.update(1)
      engine.removeEntity(entity)
      await engine.update(1)
      await flushMicrotasks()
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should log the rejection', () => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('[players] onLeaveScene handler failed:', expect.any(Error))
    })
  })

  describe('when an async handler rejects during replay', () => {
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(async () => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      addIdentity('0xasync3')
      await engine.update(1)
      players.onEnterScene(
        async () => {
          await Promise.resolve()
          throw new Error('async replay blew up')
        },
        { requireProfile: false, replayPresent: true }
      )
      await flushMicrotasks()
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should log the rejection', () => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('[players] onEnterScene replay handler failed:', expect.any(Error))
    })
  })

  describe('when an async name-change handler rejects', () => {
    let consoleErrorSpy: jest.SpyInstance
    let entity: Entity

    beforeEach(async () => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      players.onPlayerNameChanged(async () => {
        await Promise.resolve()
        throw new Error('async rename blew up')
      })
      entity = addIdentity('0xasync4')
      await engine.update(1)
      setAvatarName(entity, 'Ada')
      await engine.update(1)
      await flushMicrotasks()
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should log the rejection', () => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('[players] onPlayerNameChanged handler failed:', expect.any(Error))
    })
  })

  describe('when an entity has avatar data but no identity', () => {
    let entity: Entity

    beforeEach(async () => {
      entity = engine.addEntity()
      setAvatarName(entity, 'Nameless')
      await engine.update(1)
    })

    it('should not be treated as a player', () => {
      expect(players.getPlayer({ userId: '' })).toBeNull()
    })

    it('should not be counted', () => {
      expect(players.getPlayerCount()).toBe(0)
    })
  })

  describe('when a player arrives with a profile already present', () => {
    let defaultCalls: string[]
    let identityCalls: string[]
    let entity: Entity

    beforeEach(async () => {
      defaultCalls = []
      identityCalls = []
      players.onEnterScene((player) => defaultCalls.push(player.name))
      players.onEnterScene((player) => identityCalls.push(player.userId), { requireProfile: false })
      entity = addIdentity('0xaaaa')
      setAvatarName(entity, 'Ada')
      await engine.update(1)
    })

    it('should call the default handler exactly once', () => {
      expect(defaultCalls).toEqual(['Ada'])
    })

    it('should call the identity handler exactly once', () => {
      expect(identityCalls).toEqual(['0xaaaa'])
    })

    describe('and further ticks pass with no change', () => {
      beforeEach(async () => {
        await engine.update(1)
      })

      it('should not call the default handler again', () => {
        expect(defaultCalls).toEqual(['Ada'])
      })

      it('should not call the identity handler again', () => {
        expect(identityCalls).toEqual(['0xaaaa'])
      })
    })
  })

  describe('when a player with an unresolved profile leaves', () => {
    let snapshots: PlayerSnapshot[]
    let entity: Entity

    beforeEach(async () => {
      snapshots = []
      players.onLeaveScene((_userId, last) => snapshots.push(last), { requireProfile: false })
      entity = addIdentity('0xaaab')
      await engine.update(1)
      engine.removeEntity(entity)
      await engine.update(1)
    })

    it('should report an empty raw name', () => {
      expect(snapshots[0].name).toBe('')
    })

    it('should still offer a renderable display name', () => {
      expect(snapshots[0].displayName).toBe('0xaaab')
    })
  })

  describe('when a handler reads the tracked set during a departure', () => {
    let countDuringLeave: number
    let leaving: Entity

    beforeEach(async () => {
      countDuringLeave = -1
      players.onLeaveScene(
        () => {
          countDuringLeave = players.getPlayerCount()
        },
        { requireProfile: false }
      )
      leaving = addIdentity('0xgone')
      addIdentity('0xstays')
      await engine.update(1)
      engine.removeEntity(leaving)
      await engine.update(1)
    })

    it('should observe the settled set without the departing player', () => {
      expect(countDuringLeave).toBe(1)
    })
  })

  describe('when several players are present and one address is duplicated', () => {
    let older: Entity
    let newer: Entity

    beforeEach(async () => {
      older = addIdentity('0xAAA')
      setAvatarName(older, 'Ada')
      newer = addIdentity('0xAAA')
      addIdentity('0xBBB')
      await engine.update(1)
    })

    it('should collapse the duplicated address', () => {
      expect(
        players
          .getPlayers()
          .map((player) => player.userId)
          .sort()
      ).toEqual(['0xAAA', '0xBBB'])
    })

    it('should return the same element that getPlayer returns', () => {
      expect(players.getPlayers().find((player) => player.userId === '0xAAA')).toEqual(
        players.getPlayer({ userId: '0xaaa' })
      )
    })

    it('should agree with getPlayerCount', () => {
      expect(players.getPlayers()).toHaveLength(players.getPlayerCount())
    })

    it('should expose the wearables as a copy rather than the live component', () => {
      const first = players.getPlayer({ userId: '0xAAA' })!
      first.wearables.push('urn:injected')

      expect(players.getPlayer({ userId: '0xAAA' })!.wearables).toEqual([])
    })
  })

  describe('when a second entity claims the address of a tracked player', () => {
    let incumbent: Entity
    let claimant: Entity

    beforeEach(async () => {
      incumbent = addIdentity('0xvictim')
      await engine.update(1)
      claimant = addIdentity('0xvictim')
      setAvatarName(claimant, 'Impostor')
      await engine.update(1)
    })

    it('should keep tracking the incumbent entity', () => {
      expect(players.getPlayer({ userId: '0xvictim' })?.entity).toBe(incumbent)
    })

    it('should not adopt the claimant name', () => {
      expect(players.getPlayer({ userId: '0xvictim' })?.displayName).toBe('0xvictim')
    })

    describe('and the incumbent entity goes away', () => {
      beforeEach(async () => {
        engine.removeEntity(incumbent)
        await engine.update(1)
      })

      it('should adopt the surviving entity', () => {
        expect(players.getPlayer({ userId: '0xvictim' })?.entity).toBe(claimant)
      })
    })
  })

  describe('when a departing player had a refreshed guest flag and a mixed-case address', () => {
    let seen: string[]
    let snapshot: PlayerSnapshot
    let joinedAtMs: number
    let entity: Entity

    beforeEach(async () => {
      seen = []
      players.onLeaveScene(
        (userId, lastKnown) => {
          seen.push(userId)
          snapshot = lastKnown
        },
        { requireProfile: false }
      )
      entity = addIdentity('0xMiXeDCaSe', true)
      await engine.update(1)
      joinedAtMs = players.getPlayer({ userId: '0xmixedcase' })!.joinedAtMs
      setAvatarName(entity, 'Ada')
      PlayerIdentityData.getMutable(entity).isGuest = false
      await engine.update(1)
      engine.removeEntity(entity)
      await engine.update(1)
    })

    it('should report the platform-reported casing', () => {
      expect(seen).toEqual(['0xMiXeDCaSe'])
    })

    it('should carry the refreshed guest flag', () => {
      expect(snapshot.isGuest).toBe(false)
    })

    it('should carry the join timestamp', () => {
      expect(snapshot.joinedAtMs).toBe(joinedAtMs)
    })

    it('should carry the resolved-name flag', () => {
      expect(snapshot.nameResolved).toBe(true)
    })
  })

  describe('when departure and name-change subscriptions are cancelled', () => {
    let left: string[]
    let renamed: string[]
    let staying: Entity
    let leaving: Entity

    beforeEach(async () => {
      left = []
      renamed = []
      const stopLeave = players.onLeaveScene((userId) => left.push(userId), { requireProfile: false })
      const stopRename = players.onPlayerNameChanged((player) => renamed.push(player.displayName))
      staying = addIdentity('0xstays')
      leaving = addIdentity('0xgoes')
      await engine.update(1)
      stopLeave()
      stopRename()
      engine.removeEntity(leaving)
      setAvatarName(staying, 'Ada')
      await engine.update(1)
    })

    it('should stop delivering departures', () => {
      expect(left).toEqual([])
    })

    it('should stop delivering name changes', () => {
      expect(renamed).toEqual([])
    })
  })

  describe('when a resolved name later changes', () => {
    let renamed: string[]
    let entity: Entity

    beforeEach(async () => {
      renamed = []
      entity = addIdentity('0xrename')
      setAvatarName(entity, 'Ada')
      players.onPlayerNameChanged((player) => renamed.push(player.displayName))
      await engine.update(1)
      setAvatarName(entity, 'Bob')
      await engine.update(1)
    })

    it('should report the new name', () => {
      expect(renamed).toEqual(['Bob'])
    })
  })

  describe('when a profile name carries rich-text markup', () => {
    let entity: Entity

    beforeEach(async () => {
      entity = addIdentity('0xmarkup')
      setAvatarName(entity, '<b><color=#ff0000>SYSTEM</color></b>' + 'x'.repeat(200))
      await engine.update(1)
    })

    it('should strip the angle brackets from the display name', () => {
      expect(players.getPlayer({ userId: '0xmarkup' })!.displayName).not.toMatch(/[<>]/)
    })

    it('should cap the display name length', () => {
      expect(players.getPlayer({ userId: '0xmarkup' })!.displayName.length).toBeLessThanOrEqual(64)
    })

    it('should leave the raw name untouched', () => {
      expect(players.getPlayer({ userId: '0xmarkup' })!.name).toContain('<b>')
    })
  })

  describe('when only avatar data exists on the local entity', () => {
    beforeEach(async () => {
      setAvatarName(engine.PlayerEntity, 'Nameless')
      await engine.update(1)
    })

    it('should not treat the local entity as a player', () => {
      expect(players.getPlayer()).toBeNull()
    })

    it('should not include it in the player list', () => {
      expect(players.getPlayers()).toEqual([])
    })

    it('should fail an explicit empty-address lookup', () => {
      expect(players.getPlayer({ userId: '' })).toBeNull()
    })
  })

  describe('when the helper is constructed repeatedly for one engine', () => {
    beforeEach(() => {
      definePlayerHelper(engine)
      definePlayerHelper(engine)
    })

    it('should register exactly one tracking system', () => {
      expect(engine.removeSystem('@dcl/sdk/players')).toBe(true)
      expect(engine.removeSystem('@dcl/sdk/players')).toBe(false)
    })
  })

  describe('when the identity on a tracked entity is reassigned between ticks', () => {
    let entity: Entity

    beforeEach(async () => {
      entity = addIdentity('0xold')
      await engine.update(1)
      // Reassigned without letting the tracker settle, so the index still points here.
      PlayerIdentityData.getMutable(entity).address = '0xnew'
    })

    it('should not answer the old address with the new player', () => {
      expect(players.getPlayer({ userId: '0xold' })).toBeNull()
    })

    it('should find the new address by live scan', () => {
      expect(players.getPlayer({ userId: '0xnew' })?.entity).toBe(entity)
    })
  })

  describe('when the entity backing an address is replaced within one tick', () => {
    let replaced: Entity
    let replacement: Entity
    let arrivals: string[]
    let departures: string[]

    beforeEach(async () => {
      arrivals = []
      departures = []
      players.onEnterScene((player) => arrivals.push(player.userId), { requireProfile: false })
      players.onLeaveScene((userId) => departures.push(userId), { requireProfile: false })
      replaced = addIdentity('0xswap')
      await engine.update(1)
      engine.removeEntity(replaced)
      replacement = addIdentity('0xswap')
      await engine.update(1)
    })

    it('should report only the original arrival', () => {
      expect(arrivals).toEqual(['0xswap'])
    })

    it('should not report a departure', () => {
      expect(departures).toEqual([])
    })

    it('should expose the replacement entity when re-read', () => {
      expect(players.getPlayer({ userId: '0xswap' })?.entity).toBe(replacement)
    })

    it('should no longer expose the replaced entity', () => {
      expect(players.getPlayer({ userId: '0xswap' })?.entity).not.toBe(replaced)
    })
  })
})
