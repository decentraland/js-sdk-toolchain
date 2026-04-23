import path from 'path'
import { isEditorScene } from '../../../packages/@dcl/sdk-commands/src/logic/project-validations'

const WORKING_DIR = '/test/project'
const COMPOSITE_PATH = path.resolve(WORKING_DIR, 'assets', 'scene', 'main.composite')

/**
 * Build a minimal mock fs component for isEditorScene tests.
 * @param fileExists Whether the main.composite file "exists"
 * @param compositeContent The JSON content to return when the file is read (undefined = not called)
 */
function makeMockFs(fileExists: boolean, compositeContent?: object | string) {
  return {
    fileExists: jest.fn().mockImplementation((p: string) => {
      if (p === COMPOSITE_PATH) return Promise.resolve(fileExists)
      return Promise.resolve(false)
    }),
    readFile: jest.fn().mockImplementation(() => {
      const content = typeof compositeContent === 'string' ? compositeContent : JSON.stringify(compositeContent)
      return Promise.resolve(Buffer.from(content, 'utf-8'))
    })
  }
}

describe('isEditorScene', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  // T1 — file absent
  it('returns false when main.composite does not exist', async () => {
    const fs = makeMockFs(false)
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
    expect(fs.readFile).not.toHaveBeenCalled()
  })

  // T2 — file exists, no `components` key
  it('returns false when composite JSON has no components field', async () => {
    const fs = makeMockFs(true, { version: 1 })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  // T3 — file exists, empty components array
  it('returns false when composite has an empty components array', async () => {
    const fs = makeMockFs(true, { version: 1, components: [] })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  // T4 — file exists, only core:: components
  it('returns false when composite contains only core:: components', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ name: 'core::Transform' }, { name: 'core::GltfContainer' }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  // T5 — file exists, only asset-packs::Script (excluded from check)
  it('returns false when composite contains only asset-packs::Script', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ name: 'asset-packs::Script' }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  // T6 — file exists, one non-Script asset-packs:: component
  it('returns true when composite contains a non-Script asset-packs:: component', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ name: 'asset-packs::Trigger' }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(true)
  })

  // T7 — file exists, asset-packs::Script + asset-packs::Trigger
  it('returns true when composite contains asset-packs::Script and a non-Script asset-packs:: component', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ name: 'asset-packs::Script' }, { name: 'asset-packs::Trigger' }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(true)
  })

  // T8 — file exists, invalid JSON
  it('returns false when composite file contains invalid JSON', async () => {
    const fs = makeMockFs(true, 'this is not valid json {{{')
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  // T9 — file exists, components is not an array
  it('returns false when components is not an array', async () => {
    const fs = makeMockFs(true, { version: 1, components: { name: 'asset-packs::Trigger' } })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  // T10 — file exists, component items lack a name field
  it('returns false when component items do not have a name field', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ data: {} }, { jsonSchema: {} }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  // Extra: multiple asset-packs:: components, none being Script
  it('returns true when composite contains multiple non-Script asset-packs:: components', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [
        { name: 'core::Transform' },
        { name: 'asset-packs::Action' },
        { name: 'asset-packs::State' }
      ]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(true)
  })
})
