import { defaultDclIgnore, getDCLIgnorePatterns } from '../../../packages/@dcl/sdk-commands/src/logic/dcl-ignore'

describe('dcl-ignore', () => {
  describe('defaultDclIgnore', () => {
    it('should include *.map to exclude sourcemap files', () => {
      expect(defaultDclIgnore).toContain('*.map')
    })
  })

  describe('getDCLIgnorePatterns', () => {
    it('should include *.map in patterns when no .dclignore file exists', async () => {
      const components = {
        fs: {
          readFile: jest.fn().mockRejectedValue(new Error('ENOENT'))
        }
      }
      const patterns = await getDCLIgnorePatterns(components as any, '/some/dir')
      expect(patterns).toContain('*.map')
    })

    it('should include *.map in patterns even when a custom .dclignore exists', async () => {
      const components = {
        fs: {
          readFile: jest.fn().mockResolvedValue('custom-folder\n*.log')
        }
      }
      const patterns = await getDCLIgnorePatterns(components as any, '/some/dir')
      expect(patterns).toContain('*.map')
      // custom patterns should also be present
      expect(patterns).toContain('custom-folder')
      expect(patterns).toContain('*.log')
    })

    it('always ignores the asset-bundle sidecar cache, even for scenes with a custom .dclignore', async () => {
      // A watched write inside .dcl-optimized-assets means reload → manifest
      // request → revalidation write → reload, forever. The `**/` form is
      // required because the file watcher tests absolute paths, which the bare
      // `.*` entry does not prune.
      const components = {
        fs: {
          readFile: jest.fn().mockResolvedValue('node_modules\nbin/*.map')
        }
      }
      const patterns = await getDCLIgnorePatterns(components as any, '/some/dir')
      expect(patterns).toContain('.dcl-optimized-assets')
      expect(patterns).toContain('**/.dcl-optimized-assets/**')
    })
  })
})
