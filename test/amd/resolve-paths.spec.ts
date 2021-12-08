import { mockEnvironment } from './helpers'

describe('file structure and path normalization tests', () => {
  testFileStructure(
    'case1',
    {
      'dep-a': ['exports', './dep-b'],
      'dep-b': ['./abc/../avx/../dep-c'],
      'dep-c': [],
      'a/b/c': ['../../dep-a'],
      '': ['./dep-a', 'a/b/c']
    },
    {
      'dep-a': ['exports', 'dep-b'],
      'dep-b': ['dep-c'],
      'dep-c': [],
      'a/b/c': ['dep-a'],
      'unnamed-module-0': ['dep-a', 'a/b/c']
    }
  )

  testFileStructure(
    'recursive case',
    {
      a: ['b', 'c'],
      b: ['c', 'a'],
      c: ['a', 'b'],
      '': ['a', 'b']
    },
    {
      a: ['b', 'c'],
      b: ['c', 'a'],
      c: ['a', 'b'],
      'unnamed-module-0': ['a', 'b']
    }
  )
})

function testFileStructure(
  name: string,
  defines: Record<string, string[]>,
  result: Record<string, string[]>
) {
  describe(name, () => {
    const { starters, define, errors, getModules } = mockEnvironment({})
    function prettyDependencies() {
      const ret: Record<string, string[]> = {}
      const modules = getModules()
      for (const i in modules) {
        ret[i] = modules[i].dependencies
      }
      return ret
    }

    let i = 0
    const inc = () => i++

    it('define files and validates final structure', async () => {
      for (const i in defines) {
        if (i !== '') {
          define(i, defines[i], inc)
        } else {
          define(defines[i], inc)
        }
      }
      expect(prettyDependencies()).toEqual(result)
      expect(starters.length).toEqual(1)
      expect(errors).toEqual([])
      expect(i).toEqual(Object.keys(defines).length)
    })
  })
}
