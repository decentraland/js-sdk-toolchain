import { resolve } from 'path'
import { itExecutes } from '../../scripts/helpers'

describe('should compile all snippets files', () => {
  const snippetsPath = resolve(process.cwd(), 'test', 'ecs', 'snippets')
  const TSC = resolve(process.cwd(), 'node_modules', '.bin') + '/tsc'
  itExecutes(`${TSC} -p tsconfig.json`, snippetsPath)
})
