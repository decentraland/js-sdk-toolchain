import { resolve } from 'path'

const ecsLocation = resolve(__dirname, '../../packages/decentraland-ecs')
const express = require('express')
const mockDclObject = {
    getWorkingDir: () => ecsLocation
}
const supertest = require('supertest')

describe('decentraland-ecs: setupProxy.js resolve endpoints successful', () => {
    const setupProxy = require(`${ecsLocation}/src/setupProxy.js`)

    const app = express()

    setupProxy(mockDclObject, app, express);
    const request = supertest(app);

    const criticalEndpoints = [
        '/',
        '/@/artifacts/preview.js',
        '/@/artifacts/unity-renderer/unity.wasm',
        '/@/artifacts/unity-renderer/unity.framework.js',
        '/@/artifacts/unity-renderer/unity.data',
        '/@/artifacts/unity-renderer/index.js'
    ]

    for (const endpoint of criticalEndpoints){
        test(`endpoint '${endpoint}'`, async () => {
            await request.get(endpoint).expect(200)
        });
    }
})