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
  })
})
