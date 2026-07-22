import { getDCLIgnorePatterns } from '../../../packages/@dcl/sdk-commands/src/logic/dcl-ignore'

describe('getDCLIgnorePatterns', () => {
  const components = {
    fs: {
      readFile: jest.fn(async () => {
        throw new Error('ENOENT')
      })
    }
  } as any

  it('always ignores the asset-bundle sidecar cache, even for scenes with a custom .dclignore', async () => {
    // A watched write inside .dcl-optimized-assets means reload → manifest
    // request → revalidation write → reload, forever. The `**/` form is
    // required because the file watcher tests absolute paths, which the bare
    // `.*` entry does not prune.
    components.fs.readFile.mockResolvedValueOnce('node_modules\nbin/*.map')

    const patterns = await getDCLIgnorePatterns(components, '/tmp/scene')

    expect(patterns).toContain('.dcl-optimized-assets')
    expect(patterns).toContain('**/.dcl-optimized-assets/**')
  })
})
