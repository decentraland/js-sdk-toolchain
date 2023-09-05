import { getContentType } from '../../packages/@dcl/sdk-commands/src/linker-dapp/api'

describe('linker-dapp', () => {
  describe('getContentType', () => {
    it('should return css', () => {
      expect(getContentType('css')).toBe('text/css')
    })
    it('should return js', () => {
      expect(getContentType('js')).toBe('application/js')
    })
    it('should return plain', () => {
      expect(getContentType('media')).toBe('text/plain')
    })
    it('should return plain with unknown string', () => {
      expect(getContentType('zzzzzz')).toBe('text/plain')
      expect(getContentType('')).toBe('text/plain')
    })
  })
})
