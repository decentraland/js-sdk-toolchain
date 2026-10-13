import {
  buildSceneTarget,
  normalizeMetricName,
  normalizeParcel,
  normalizeWorldName,
  parseDuration,
  parseInteger,
  parseLevel,
  parseTime
} from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/inputs'

describe('when normalizing a world name', () => {
  describe('and it is a bare DCL name', () => {
    let raw: string

    beforeEach(() => {
      raw = 'MyWorld'
    })

    it('should lowercase it and append .dcl.eth', () => {
      expect(normalizeWorldName(raw)).toBe('myworld.dcl.eth')
    })
  })

  describe('and it already ends in .dcl.eth', () => {
    let raw: string

    beforeEach(() => {
      raw = 'myworld.dcl.eth'
    })

    it('should keep it as is', () => {
      expect(normalizeWorldName(raw)).toBe('myworld.dcl.eth')
    })
  })

  describe('and it is another ENS name', () => {
    let raw: string

    beforeEach(() => {
      raw = 'myworld.eth'
    })

    it('should keep the ENS name instead of turning it into a DCL name', () => {
      expect(normalizeWorldName(raw)).toBe('myworld.eth')
    })
  })

  describe('and it contains characters a name cannot have', () => {
    let raw: string

    beforeEach(() => {
      raw = 'my world/../x'
    })

    it('should throw an invalid argument error', () => {
      expect(() => normalizeWorldName(raw)).toThrow(
        expect.objectContaining({ name: 'SCENE_INSIGHTS_INVALID_ARGUMENT' })
      )
    })
  })
})

describe('when normalizing a parcel', () => {
  describe('and it has spaces and leading zeros', () => {
    let raw: string

    beforeEach(() => {
      raw = ' -010 , 07 '
    })

    it('should return the canonical x,y form', () => {
      expect(normalizeParcel(raw)).toBe('-10,7')
    })
  })

  describe('and it is not a pair of integers', () => {
    let raw: string

    beforeEach(() => {
      raw = '10'
    })

    it('should throw an invalid argument error naming --position', () => {
      expect(() => normalizeParcel(raw)).toThrow(/Invalid --position "10"/)
    })
  })
})

describe('when building the scene target', () => {
  describe('and only a world is given', () => {
    let world: string

    beforeEach(() => {
      world = 'myworld.dcl.eth'
    })

    it('should sign the world as sceneId and realmName without a parcel', () => {
      expect(JSON.parse(buildSceneTarget(world, undefined).metadata)).toEqual({
        sceneId: 'myworld.dcl.eth',
        realmName: 'myworld.dcl.eth'
      })
    })
  })

  describe('and a world and a parcel are given', () => {
    let world: string
    let parcel: string

    beforeEach(() => {
      world = 'myworld.dcl.eth'
      parcel = '10,10'
    })

    it('should also sign the parcel, to pick one scene of a multi-scene world', () => {
      expect(JSON.parse(buildSceneTarget(world, parcel).metadata)).toEqual({
        sceneId: 'myworld.dcl.eth',
        realmName: 'myworld.dcl.eth',
        parcel: '10,10'
      })
    })
  })

  describe('and only a parcel is given', () => {
    let parcel: string

    beforeEach(() => {
      parcel = '-125,-96'
    })

    it('should target the Genesis City scene by parcel on the main realm', () => {
      expect(buildSceneTarget(undefined, parcel)).toEqual({
        label: 'Genesis City -125,-96',
        metadata: JSON.stringify({ parcel: '-125,-96', realmName: 'main' }),
        parcel: '-125,-96'
      })
    })
  })

  describe('and neither is given', () => {
    it('should throw a missing scene error', () => {
      expect(() => buildSceneTarget(undefined, undefined)).toThrow(
        expect.objectContaining({ name: 'SCENE_INSIGHTS_MISSING_SCENE' })
      )
    })
  })
})

describe('when parsing a time', () => {
  let now: number

  beforeEach(() => {
    now = Date.parse('2026-10-12T14:00:00.000Z')
  })

  describe('and it is "now"', () => {
    it('should return the current time in ISO-8601', () => {
      expect(parseTime('now', '--to', now)).toBe('2026-10-12T14:00:00.000Z')
    })
  })

  describe('and it is a duration', () => {
    it('should return that long before now', () => {
      expect(parseTime('90m', '--from', now)).toBe('2026-10-12T12:30:00.000Z')
    })
  })

  describe('and it is a duration in days within the retention', () => {
    it('should return that many days before now', () => {
      expect(parseTime('6d', '--from', now)).toBe('2026-10-06T14:00:00.000Z')
    })
  })

  describe('and it is the whole 7-day retention', () => {
    it('should stop a minute short, so the range still fits when it reaches the service', () => {
      expect(parseTime('7d', '--from', now)).toBe('2026-10-05T14:01:00.000Z')
    })
  })

  describe('and it is longer than the retention', () => {
    it('should be clamped to the retention window', () => {
      expect(parseTime('30d', '--from', now)).toBe('2026-10-05T14:01:00.000Z')
    })
  })

  describe('and it is epoch milliseconds', () => {
    it('should return the same instant in ISO-8601', () => {
      expect(parseTime('1791813600000', '--from', now)).toBe(new Date(1791813600000).toISOString())
    })
  })

  describe('and it is ISO-8601 with an offset', () => {
    it('should return the same instant in UTC', () => {
      expect(parseTime('2026-10-12T09:00:00-03:00', '--from', now)).toBe('2026-10-12T12:00:00.000Z')
    })
  })

  describe('and it is ISO-8601 without an offset', () => {
    it('should throw instead of guessing the time zone', () => {
      expect(() => parseTime('2026-10-12T09:00:00', '--from', now)).toThrow(/Invalid --from/)
    })
  })

  describe('and it is epoch seconds', () => {
    it('should throw instead of reading them as milliseconds', () => {
      expect(() => parseTime('1791813600', '--from', now)).toThrow(/Invalid --from/)
    })
  })
})

describe('when parsing a level', () => {
  describe('and it is a known level in any case', () => {
    it('should return it lowercased', () => {
      expect(parseLevel('WARN')).toBe('warn')
    })
  })

  describe('and it is unknown', () => {
    it('should throw an error listing the levels', () => {
      expect(() => parseLevel('fatal')).toThrow(/use debug, info, warn, error/)
    })
  })
})

describe('when parsing an integer flag', () => {
  describe('and it is inside the range', () => {
    it('should return it', () => {
      expect(parseInteger(500, '--limit', 1, 10_000)).toBe(500)
    })
  })

  describe('and it is outside the range', () => {
    it('should throw an error with the range', () => {
      expect(() => parseInteger(0, '--limit', 1, 10_000)).toThrow('--limit must be an integer between 1 and 10000')
    })
  })

  describe('and it is not an integer', () => {
    it('should throw an error with the range', () => {
      expect(() => parseInteger(NaN, '--step', 10, 86_400)).toThrow('--step must be an integer between 10 and 86400')
    })
  })
})

describe('when normalizing a metric name', () => {
  describe('and it is the short form', () => {
    it('should prefix dcl.scene.', () => {
      expect(normalizeMetricName('cpu.run_ms')).toBe('dcl.scene.cpu.run_ms')
    })
  })

  describe('and it is the full name', () => {
    it('should keep it', () => {
      expect(normalizeMetricName('dcl.scene.mem.heap_used')).toBe('dcl.scene.mem.heap_used')
    })
  })
})

describe('when parsing a duration', () => {
  describe('and it has a unit', () => {
    it('should return it in milliseconds', () => {
      expect(parseDuration('2m', '--for')).toBe(120_000)
    })
  })

  describe('and it is zero', () => {
    it('should throw an invalid argument error naming the flag', () => {
      expect(() => parseDuration('0s', '--for')).toThrow(/Invalid --for "0s"/)
    })
  })

  describe('and it has no unit', () => {
    it('should throw an invalid argument error naming the flag', () => {
      expect(() => parseDuration('30', '--for')).toThrow(/Invalid --for "30"/)
    })
  })
})
