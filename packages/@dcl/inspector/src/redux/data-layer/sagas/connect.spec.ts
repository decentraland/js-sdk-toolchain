/* eslint-disable @typescript-eslint/ban-types */
import { expectSaga, testSaga } from 'redux-saga-test-plan'
import * as codegen from '@dcl/rpc/dist/codegen'

import { connectSaga, createSocketChannel, createWebSocketConnection } from './connect'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { RpcClient, RpcClientPort, Transport, createRpcClient } from '@dcl/rpc'
import { DataLayerRpcClient } from '../../../lib/data-layer/types'
import reducer, { connected, getDataLayerInterface, reconnect } from '..'
import { createLocalDataLayerRpcClient } from '../../../lib/data-layer/client/local-data-layer'
import { getConfig } from '../../../lib/logic/config'
import { call } from 'redux-saga/effects'

describe('WebSocket Connection Saga', () => {
  it('Should create LOCAL data-layer if no ws url is provided', async () => {
    const dataLayer = { boedo: 'casla' } as any as DataLayerRpcClient

    await expectSaga(connectSaga)
      .withReducer(reducer)
      .provide([
        [call(getConfig), { dataLayerRpcWsUrl: null }],
        [call(createLocalDataLayerRpcClient), dataLayer]
      ])
      .put(connected({ dataLayer }))
      .hasFinalState({
        error: undefined,
        reconnectAttempts: 0,
        removingAsset: {}
      })
      .run()
    expect(getDataLayerInterface()).toBe(dataLayer)
  })

  it('Should create remote data-layer with Ws', async () => {
    const url = 'ws://boedo.com'
    const ws = new MockWebSocket()
    const channel = createSocketChannel(ws as any as WebSocket)
    const clientTransport = {} as Transport
    const client: RpcClient = { createPort: (_port: string) => {} } as RpcClient
    const clientPort: RpcClientPort = {} as RpcClientPort
    const dataLayer = { boedo: 'casla' } as any as DataLayerRpcClient
    jest.spyOn(codegen, 'loadService').mockReturnValue(dataLayer as any)
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    testSaga(connectSaga)
      .next()
      .call(getConfig)
      .next({ dataLayerRpcWsUrl: url })
      .call(createWebSocketConnection, url)
      .next(ws)
      .call(createSocketChannel, ws)
      .next(channel)
      .take(channel as any)

      // OPEN event. Connect data layer
      .next({ type: 'WS_OPENED' })
      .call(WebSocketTransport, ws)
      .next(clientTransport)
      .call(createRpcClient, clientTransport)
      .next(client)
      .call(client.createPort, 'scene-ctx')
      .next(clientPort)
      .put(connected({ dataLayer }))
      .next()

      // Error event. console.error (TODO: handle this)
      .next({ type: 'WS_ERROR', error: 'some - error' })

      // Break  the connection. Should reconnect
      .finish()
      .put(reconnect())
      .next()
      .isDone()

    // Error logic
    expect(consoleSpy).toBeCalledWith('some - error')
  })
})

// Mock WebSocket

class MockWebSocket {
  listeners: { [key: string]: Function[] } = {}

  addEventListener(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  removeEventListener(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback)
    }
  }

  simulateOpen() {
    if (this.listeners['open']) {
      this.listeners['open'].forEach((callback) => callback())
    }
  }

  simulateMessage(data: any) {
    if (this.listeners['message']) {
      this.listeners['message'].forEach((callback) => callback({ data }))
    }
  }

  simulateClose() {
    if (this.listeners['close']) {
      this.listeners['close'].forEach((callback) => callback())
    }
  }

  simulateError() {
    if (this.listeners['error']) {
      this.listeners['error'].forEach((callback) => callback())
    }
  }
}
