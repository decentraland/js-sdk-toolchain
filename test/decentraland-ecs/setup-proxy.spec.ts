import { resolve } from 'path'
import * as express from 'express'
import * as supertest from 'supertest'

const ecsLocation = resolve(__dirname, '../../packages/decentraland-ecs')
const mockDclObject = {
    getWorkingDir: () => ecsLocation
}


describe('decentraland-ecs: setupProxy.js resolve endpoints successful', () => {
    const setupProxy = require(`${ecsLocation}/src/setupProxy.js`)

    const app = express()

    setupProxy(mockDclObject, app, express);
    const request = supertest(app);

    const criticalEndpoints = [
        '/',
        '/@/artifacts/index.js',
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
