import { resolve } from 'path'

const ecsLocation = resolve(__dirname, '../../packages/decentraland-ecs')

describe('decentraland-ecs: setupExport.js', () => {
  const setupExport = require(`${ecsLocation}/src/setupExport.js`)
  test(`require and call successfully`, async () => {
    await setupExport('', '', {}, {})
  })
})
