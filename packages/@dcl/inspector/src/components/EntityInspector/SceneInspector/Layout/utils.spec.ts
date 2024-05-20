import { MAX_AXIS_PARCELS, TILE_OPTIONS } from './types'
import {
  getLayoutInfo,
  getLayoutInfoFromString,
  getCoordinatesBetweenPoints,
  getCoordinatesInGridOrder,
  getOption,
  getMinMaxFromOrderedCoords,
  coordToStr,
  transformCoordsToString
} from './utils'

describe('getLayoutInfo', () => {
  it('returns correct parcel info', () => {
    const parcels = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 1, y: 1 }
    ]
    const expected = {
      min: { x: 0, y: 0 },
      max: { x: 1, y: 1 },
      length: { x: 1, y: 1 },
      parcels: parcels
    }
    expect(getLayoutInfo(parcels)).toEqual(expected)
  })
})

describe('getLayoutInfoFromString', () => {
  it('returns correct parcel info from string', () => {
    const parcelsString = '0,0 0,1 1,0 1,1'
    const expected = {
      min: { x: 0, y: 0 },
      max: { x: 1, y: 1 },
      length: { x: 1, y: 1 },
      parcels: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: 1, y: 1 }
      ]
    }
    expect(getLayoutInfoFromString(parcelsString)).toEqual(expected)
  })
})

describe('getCoordinatesBetweenPoints', () => {
  it('returns correct coordinates between two points', () => {
    const pointA = { x: 0, y: 0 }
    const pointB = { x: 2, y: 2 }
    const expected = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 }
    ]
    expect(getCoordinatesBetweenPoints(pointA, pointB)).toEqual(expected)
  })
})

describe('getCoordinatesInGridOrder', () => {
  it('returns coordinates sorted in grid order', () => {
    const unsorted = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 1, y: 1 }
    ]
    const expected = [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]
    expect(getCoordinatesInGridOrder(unsorted)).toEqual(expected)
  })
})

describe('getOption', () => {
  it('returns correct option value within range', () => {
    const value = 5
    const expected = value
    expect(getOption(value)).toEqual(expected)
  })

  it('returns 0 for value less than minimum', () => {
    const value = -1
    const expected = 0
    expect(getOption(value)).toEqual(expected)
  })

  it('returns last option value for value greater than maximum', () => {
    const value = MAX_AXIS_PARCELS + 1
    const expected = MAX_AXIS_PARCELS
    expect(getOption(value)).toEqual(expected)
  })

  it('returns correct option value for maximum value', () => {
    const value = MAX_AXIS_PARCELS
    const expected = MAX_AXIS_PARCELS
    expect(getOption(value)).toEqual(expected)
  })

  it('returns correct option value for minimum value', () => {
    const value = 1
    const expected = 1
    expect(getOption(value)).toEqual(expected)
  })

  it('returns correct option value for zero value', () => {
    const value = 0
    const expected = 0
    expect(getOption(value)).toEqual(expected)
  })

  it('returns correct option value for empty TILE_OPTIONS', () => {
    const value = 5
    const originalTileOptions = TILE_OPTIONS
    // Mocking TILE_OPTIONS to test empty case
    TILE_OPTIONS.length = 0
    const expected = 0
    expect(getOption(value)).toEqual(expected)
    // Reset TILE_OPTIONS
    TILE_OPTIONS.length = originalTileOptions.length
    originalTileOptions.forEach((value, index) => {
      TILE_OPTIONS[index] = value
    })
  })
})

describe('getMinMaxFromOrderedCoords', () => {
  it('returns correct min and max coordinates', () => {
    const coords = [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]
    const expectedMin = { x: 0, y: 0 }
    const expectedMax = { x: 2, y: 2 }
    expect(getMinMaxFromOrderedCoords(coords)).toEqual([expectedMin, expectedMax])
  })

  it('returns correct min and max coordinates when only one coordinate is present', () => {
    const coords = [{ x: 0, y: 0 }]
    const expectedMin = { x: 0, y: 0 }
    const expectedMax = { x: 0, y: 0 }
    expect(getMinMaxFromOrderedCoords(coords)).toEqual([expectedMin, expectedMax])
  })

  it('returns correct min and max coordinates when coordinates have negative values', () => {
    const coords = [
      { x: -2, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: -2, y: -1 },
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: -2, y: -2 },
      { x: -1, y: -2 },
      { x: 0, y: -2 }
    ]
    const expectedMin = { x: -2, y: -2 }
    const expectedMax = { x: 0, y: 0 }
    expect(getMinMaxFromOrderedCoords(coords)).toEqual([expectedMin, expectedMax])
  })
})

describe('transformCoordsToString', () => {
  it('transforms coordinates to string representation', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ]
    const disabledCoords = new Set<string>()
    const expected = '0,0 1,1 2,2'
    expect(transformCoordsToString(coords, disabledCoords)).toEqual(expected)
  })

  it('filters disabled coordinates', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ]
    const disabledCoords = new Set(['1,1'])
    const expected = '0,0 2,2'
    expect(transformCoordsToString(coords, disabledCoords)).toEqual(expected)
  })

  it('returns empty string for empty coordinates array', () => {
    const coords = []
    const disabledCoords = new Set<string>()
    const expected = ''
    expect(transformCoordsToString(coords, disabledCoords)).toEqual(expected)
  })

  it('returns empty string for all coordinates disabled', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ]
    const disabledCoords = new Set(['0,0', '1,1', '2,2'])
    const expected = ''
    expect(transformCoordsToString(coords, disabledCoords)).toEqual(expected)
  })

  it('handles coordinates with negative values', () => {
    const coords = [
      { x: -1, y: -1 },
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ]
    const disabledCoords = new Set(['-1,-1'])
    const expected = '0,0 1,1'
    expect(transformCoordsToString(coords, disabledCoords)).toEqual(expected)
  })

  it('handles large coordinate values', () => {
    const coords = [
      { x: 1000000, y: 1000000 },
      { x: 2000000, y: 2000000 }
    ]
    const disabledCoords = new Set<string>()
    const expected = '1000000,1000000 2000000,2000000'
    expect(transformCoordsToString(coords, disabledCoords)).toEqual(expected)
  })
})

describe('coordToStr', () => {
  it('transforms coordinate to string representation', () => {
    const coord = { x: 3, y: 5 }
    const expected = '3,5'
    expect(coordToStr(coord)).toEqual(expected)
  })

  it('handles coordinate with negative values', () => {
    const coord = { x: -3, y: -5 }
    const expected = '-3,-5'
    expect(coordToStr(coord)).toEqual(expected)
  })

  it('handles large coordinate values', () => {
    const coord = { x: 1000000, y: 2000000 }
    const expected = '1000000,2000000'
    expect(coordToStr(coord)).toEqual(expected)
  })
})
