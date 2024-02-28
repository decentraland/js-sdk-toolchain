import { InMemoryTransport } from '@dcl/mini-rpc'
import { SceneMetricsClient } from './client'
import { SceneMetricsServer } from './server'

describe('SceneMetricsRPC', () => {
  const parent = new InMemoryTransport()
  const iframe = new InMemoryTransport()

  parent.connect(iframe)
  iframe.connect(parent)

  const store = {
    getState: jest.fn()
  }

  const client = new SceneMetricsClient(parent)
  const _server = new SceneMetricsServer(iframe, store)

  describe('When using the getMetrics method of the client', () => {
    const metrics = {
      triangles: 1,
      entities: 1,
      bodies: 1,
      materials: 1,
      textures: 1
    }

    beforeEach(() => {
      store.getState.mockReturnValueOnce({
        sceneMetrics: {
          metrics
        }
      })
    })

    afterEach(() => {
      store.getState.mockReset()
    })

    it('should get the metrics from the sceneMetrics state in the server', async () => {
      await expect(client.getMetrics()).resolves.toBe(metrics)
    })
  })

  describe('When using the getLimits method of the client', () => {
    const limits = {
      triangles: 1,
      entities: 1,
      bodies: 1,
      materials: 1,
      textures: 1
    }

    beforeEach(() => {
      store.getState.mockReturnValueOnce({
        sceneMetrics: {
          limits
        }
      })
    })

    afterEach(() => {
      store.getState.mockReset()
    })

    it('should get the limits from the sceneMetrics state in the server', async () => {
      await expect(client.getLimits()).resolves.toBe(limits)
    })
  })

  describe('When using the getEntitiesOutOfBoundaries method of the client', () => {
    beforeEach(() => {
      store.getState.mockReturnValueOnce({
        sceneMetrics: {
          entitiesOutOfBoundaries: 1
        }
      })
    })

    afterEach(() => {
      store.getState.mockReset()
    })

    it('should get the entities out of boundaries from the sceneMetrics state in the server', async () => {
      await expect(client.getEntitiesOutOfBoundaries()).resolves.toBe(1)
    })
  })
})
