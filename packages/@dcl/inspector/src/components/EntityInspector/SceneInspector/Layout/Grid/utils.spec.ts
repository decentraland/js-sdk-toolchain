import { getAxisLengths, getLargestAxis, chunkCoords } from './utils'

describe('getAxisLengths', () => {
  it('returns correct lengths for coordinates', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 2, y: 2 }
    ]
    const expected = { x: 3, y: 3 }
    expect(getAxisLengths(coords)).toEqual(expected)
  })

  it('handles coordinates with negative values', () => {
    const coords = [
      { x: -1, y: -1 },
      { x: 1, y: 1 }
    ]
    const expected = { x: 3, y: 3 }
    expect(getAxisLengths(coords)).toEqual(expected)
  })

  it('handles single coordinate', () => {
    const coords = [{ x: 0, y: 0 }]
    const expected = { x: 1, y: 1 }
    expect(getAxisLengths(coords)).toEqual(expected)
  })
})

describe('getLargestAxis', () => {
  it('returns correct length of the largest axis', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 2, y: 2 }
    ]
    const expected = 3
    expect(getLargestAxis(coords)).toEqual(expected)
  })

  it('handles coordinates with negative values', () => {
    const coords = [
      { x: -1, y: -1 },
      { x: 1, y: 1 }
    ]
    const expected = 3
    expect(getLargestAxis(coords)).toEqual(expected)
  })

  it('handles single coordinate', () => {
    const coords = [{ x: 0, y: 0 }]
    const expected = 1
    expect(getLargestAxis(coords)).toEqual(expected)
  })
})

describe('chunkCoords', () => {
  it('returns correct chunks for coordinates', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ]
    const chunkSize = 2
    const expected = [
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ],
      [{ x: 2, y: 2 }]
    ]
    expect(chunkCoords(coords, chunkSize)).toEqual(expected)
  })

  it('handles chunk size larger than coordinates length', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ]
    const chunkSize = 5
    const expected = [
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 }
      ]
    ]
    expect(chunkCoords(coords, chunkSize)).toEqual(expected)
  })

  it('handles chunk size of 1', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ]
    const chunkSize = 1
    const expected = [[{ x: 0, y: 0 }], [{ x: 1, y: 1 }], [{ x: 2, y: 2 }]]
    expect(chunkCoords(coords, chunkSize)).toEqual(expected)
  })

  it('handles empty coordinates array', () => {
    const coords = []
    const chunkSize = 2
    const expected = [[]]
    expect(chunkCoords(coords, chunkSize)).toEqual(expected)
  })

  it('handles chunk size of 0', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ]
    const chunkSize = 0
    const expected = [
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 }
      ]
    ]
    expect(chunkCoords(coords, chunkSize)).toEqual(expected)
  })
})
