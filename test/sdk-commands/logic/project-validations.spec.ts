import path from 'path'
import { isEditorScene } from '../../../packages/@dcl/sdk-commands/src/logic/project-validations'

const WORKING_DIR = '/test/project'
const COMPOSITE_PATH = path.resolve(WORKING_DIR, 'assets', 'scene', 'main.composite')

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

  it('returns false when main.composite does not exist', async () => {
    const fs = makeMockFs(false)
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
    expect(fs.readFile).not.toHaveBeenCalled()
  })

  it('returns false when composite JSON has no components field', async () => {
    const fs = makeMockFs(true, { version: 1 })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  it('returns false when composite has an empty components array', async () => {
    const fs = makeMockFs(true, { version: 1, components: [] })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  it('returns false when composite contains only core:: components', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ name: 'core::Transform' }, { name: 'core::GltfContainer' }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  it('returns false when composite contains only asset-packs::Script', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ name: 'asset-packs::Script' }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  it('returns true when composite contains a non-Script asset-packs:: component', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ name: 'asset-packs::Trigger' }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(true)
  })

  it('returns true when composite contains asset-packs::Script and a non-Script asset-packs:: component', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ name: 'asset-packs::Script' }, { name: 'asset-packs::Trigger' }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(true)
  })

  it('returns false when composite file contains invalid JSON', async () => {
    const fs = makeMockFs(true, 'this is not valid json {{{')
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  it('returns false when components is not an array', async () => {
    const fs = makeMockFs(true, { version: 1, components: { name: 'asset-packs::Trigger' } })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  it('returns false when component items do not have a name field', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ data: {} }, { jsonSchema: {} }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(false)
  })

  it('returns true when composite contains multiple non-Script asset-packs:: components', async () => {
    const fs = makeMockFs(true, {
      version: 1,
      components: [{ name: 'core::Transform' }, { name: 'asset-packs::Action' }, { name: 'asset-packs::State' }]
    })
    const result = await isEditorScene({ fs } as any, WORKING_DIR)
    expect(result).toBe(true)
  })
})
