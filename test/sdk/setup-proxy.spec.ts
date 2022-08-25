import { resolve } from 'path'
import express from 'express'
import supertest from 'supertest'

const ecsLocation = resolve(__dirname, '../../packages/@dcl/sdk')
const mockDclObject = {
  getWorkingDir: () => ecsLocation
}

describe('@dcl/sdk: setupProxy.js resolve endpoints successful', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const setupProxy = require(`${ecsLocation}/src/setupProxy.js`)

  const app = express()

  setupProxy(mockDclObject, app, express)
  const request = supertest(app)

  const criticalEndpoints = [
    '/',
    '/@/artifacts/index.js',
    '/@/artifacts/unity-renderer/unity.wasm',
    '/@/artifacts/unity-renderer/unity.framework.js',
    '/@/artifacts/unity-renderer/unity.data',
    '/@/artifacts/unity-renderer/index.js'
  ]

  for (const endpoint of criticalEndpoints) {
    test(`endpoint '${endpoint}'`, async () => {
      await request.get(endpoint).expect(200)
    })
  }
})
