import {
  parseInspectorPreferences,
  readPreferencesFromFile,
  InvalidPreferences,
  serializeInspectorPreferences
} from './io'
import { getDefaultInspectorPreferences } from './types'
import { createFileSystemInterface } from '../file-system-interface'
import { createInMemoryStorage } from '../storage/in-memory'

describe('Parsing inspector preferences', () => {
  it('throws InvalidPreferences on malformed JSON', () => {
    expect(() => {
      parseInspectorPreferences('{"value":}')
    }).toThrow(InvalidPreferences)
  })

  it('throws InvalidPreferences if shell is malformed', () => {
    expect(() => {
      parseInspectorPreferences('{"version": 1}')
    }).toThrow(InvalidPreferences)
  })

  it('throws InvalidPreferences if version is not set to 1', () => {
    expect(() => {
      parseInspectorPreferences('{"version": 2, "data": {}}')
    }).toThrow(InvalidPreferences)
  })

  it('throws InvalidPreferences if v1 data is invalid', () => {
    expect(() => {
      parseInspectorPreferences('{"version": 1, "data": {"freeCameraInvertRotation": 1}}')
    }).toThrow(InvalidPreferences)
  })

  it('correctly parses v1 data and returns full set of preferences even if some are omitted in input', () => {
    const preferences = {
      ...getDefaultInspectorPreferences(),
      freeCameraInvertRotation: true
    }
    expect(parseInspectorPreferences('{"version": 1, "data": {"freeCameraInvertRotation": true}}')).toEqual(preferences)
  })
})

describe('Reading preferences file', () => {
  const storage = createInMemoryStorage({
    goodFile: Buffer.from('{"version": 1, "data": {"freeCameraInvertRotation": true}}'),
    badFile: Buffer.from('{"value":}')
  })
  const memoryFs = createFileSystemInterface(storage)

  it('returns default preferences if file doesnt exist', async () => {
    const preferences = getDefaultInspectorPreferences()
    expect(await readPreferencesFromFile(memoryFs, 'noneFile')).toEqual(preferences)
  })

  it('returns default preferences if file is malformed', async () => {
    const preferences = getDefaultInspectorPreferences()
    expect(await readPreferencesFromFile(memoryFs, 'badFile')).toEqual(preferences)
  })

  it('returns correct preferences if file is well-formed', async () => {
    const preferences = {
      ...getDefaultInspectorPreferences(),
      freeCameraInvertRotation: true
    }
    expect(await readPreferencesFromFile(memoryFs, 'goodFile')).toEqual(preferences)
  })
})

describe('Writing preferences file', () => {
  const storage = createInMemoryStorage({})
  const memoryFs = createFileSystemInterface(storage)

  it('correctly writes preferences to a file', async () => {
    const preferences = {
      ...getDefaultInspectorPreferences(),
      freeCameraInvertRotation: true
    }
    await memoryFs.writeFile('goodFile', serializeInspectorPreferences(preferences))
    expect(await readPreferencesFromFile(memoryFs, 'goodFile')).toEqual(preferences)
  })
})
