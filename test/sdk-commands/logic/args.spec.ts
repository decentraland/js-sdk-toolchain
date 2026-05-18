import { parseArgs } from '../../../packages/@dcl/sdk-commands/src/logic/args'

describe('parseArgs / argv preprocessing for negative values', () => {
  const positionArgs = {
    '--position': String,
    '--world': String,
    '--port': Number,
    '--verbose': Boolean
  }

  describe('positive (non-negative) coordinates', () => {
    it('parses --position with positive x,y coords', () => {
      const result = parseArgs(['--position', '2,1'], positionArgs)
      expect(result['--position']).toBe('2,1')
    })
  })

  describe('negative coordinates', () => {
    it('parses --position with fully-negative coords (space form)', () => {
      const result = parseArgs(['--position', '-2,-1'], positionArgs)
      expect(result['--position']).toBe('-2,-1')
    })

    it('parses --position with negative x and positive y', () => {
      const result = parseArgs(['--position', '-125,96'], positionArgs)
      expect(result['--position']).toBe('-125,96')
    })

    it('parses --position with positive x and negative y', () => {
      // positive x doesn't start with '-', so no preprocessing occurs;
      // arg handles it natively
      const result = parseArgs(['--position', '2,-1'], positionArgs)
      expect(result['--position']).toBe('2,-1')
    })

    it('parses --position with both coords negative when using = form', () => {
      const result = parseArgs(['--position=-2,-1'], positionArgs)
      expect(result['--position']).toBe('-2,-1')
    })
  })

  describe('mixed argv', () => {
    it('handles --position with negative coords alongside other options', () => {
      const result = parseArgs(['--world', 'myworld', '--position', '-10,-20'], positionArgs)
      expect(result['--world']).toBe('myworld')
      expect(result['--position']).toBe('-10,-20')
    })

    it('handles --position with negative coords before other options', () => {
      const result = parseArgs(['--position', '-5,-3', '--world', 'testworld'], positionArgs)
      expect(result['--position']).toBe('-5,-3')
      expect(result['--world']).toBe('testworld')
    })
  })

  describe('non-String options are unaffected', () => {
    it('does not treat a Number option followed by a negative number as needing merge (arg handles natively)', () => {
      // --port is a Number type, not String; the `arg` library can handle
      // negative numbers for Number-typed options without preprocessing
      const result = parseArgs(['--port', '3000'], positionArgs)
      expect(result['--port']).toBe(3000)
    })

    it('does not interfere with Boolean options', () => {
      const result = parseArgs(['--verbose'], positionArgs)
      expect(result['--verbose']).toBe(true)
    })
  })

  describe('String option at end of argv (no following token)', () => {
    it('throws when a required String option has no value', () => {
      expect(() => parseArgs(['--position'], positionArgs)).toThrow()
    })
  })

  describe('String option followed by non-negative-number dash token', () => {
    it('does not preprocess when next token starts with dash-letter (treated as flag)', () => {
      // --world followed by something like -b should NOT be merged; let arg error naturally
      expect(() => parseArgs(['--world', '-b'], positionArgs)).toThrow()
    })
  })
})
