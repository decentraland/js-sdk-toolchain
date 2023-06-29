import { IEngine } from '@dcl/ecs'
import { END, EventChannel, eventChannel } from 'redux-saga'
import * as codegen from '@dcl/rpc/dist/codegen'
import { call, put, take } from 'redux-saga/effects'
import { createRpcClient, RpcClient, RpcClientPort, Transport } from '@dcl/rpc'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'

import { connected, IDataLayer, reconnect } from '../'
import { createLocalDataLayerRpcClient } from '../../../lib/data-layer/client/local-data-layer'
import { DataServiceDefinition } from '../../..//lib/data-layer/proto/gen/data-layer.gen'
import { DataLayerRpcClient } from '../../../lib/data-layer/types'

export function getWsUrl() {
  const dataLayerWsByQueryParams = new URLSearchParams(window.location.search).get('ws')
  const dataLayerWsByGlobalThis = ((globalThis as any).InspectorConfig?.dataLayerRpcWsUrl as string) || null

  return dataLayerWsByQueryParams || dataLayerWsByGlobalThis || null
}

export function createWebSocketConnection(url: string): WebSocket {
  return new WebSocket(url)
}

export function createSocketChannel(socket: WebSocket): EventChannel<WsActions> {
  return eventChannel((emit) => {
    socket.addEventListener('close', () => {
      emit(END)
    })
    socket.addEventListener('error', (error) => {
      emit({ type: 'WS_ERROR', error })
    })
    socket.addEventListener('open', () => {
      emit({ type: 'WS_OPENED' })
    })
    return () => {}
  })
}

export type WsActions =
  | {
      type: 'WS_OPENED'
    }
  | {
      type: 'WS_ERROR'
      error: unknown
    }

export function* connectSaga() {
  const wsUrl: string | undefined = yield call(getWsUrl)

  if (!wsUrl) {
    const dataLayer: IDataLayer = yield call(createLocalDataLayerRpcClient)
    yield put(connected({ dataLayer }))
    return
  }
  const ws: WebSocket = yield call(createWebSocketConnection, wsUrl)
  const socketChannel: EventChannel<WsActions> = yield call(createSocketChannel, ws)
  try {
    while (true) {
      const wsEvent: WsActions = yield take(socketChannel)

      if (wsEvent.type === 'WS_OPENED') {
        const clientTransport: Transport = yield call(WebSocketTransport, ws)
        const client: RpcClient = yield call(createRpcClient, clientTransport)
        const clientPort: RpcClientPort = yield call(client.createPort, 'scene-ctx')
        const dataLayer: DataLayerRpcClient = codegen.loadService<{ engine: IEngine }, DataServiceDefinition>(
          clientPort,
          DataServiceDefinition
        )
        yield put(connected({ dataLayer }))
      } else if (wsEvent.type === 'WS_ERROR') {
        console.error(wsEvent.error)
      }
    }
  } catch (error) {
    console.log('[WS] Error', error)
  } finally {
    yield put(reconnect())
  }
}
