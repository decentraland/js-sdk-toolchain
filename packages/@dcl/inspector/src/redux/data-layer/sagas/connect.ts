import * as codegen from '@dcl/rpc/dist/codegen'
import { call, put, take } from 'redux-saga/effects'
import { createRpcClient, RpcClient, RpcClientPort } from '@dcl/rpc'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'

import { connected, DataLayerState, reconnect } from '../'
import { createLocalDataLayerRpcClient } from '../../../lib/data-layer/client/local-data-layer'
import { DataServiceDefinition } from '../../..//lib/data-layer/proto/gen/data-layer.gen'
import { DataLayerRpcClient } from '../../../lib/data-layer/types'
import { IEngine } from '@dcl/ecs'
import { END, EventChannel, eventChannel } from 'redux-saga'

function getWsUrl() {
  const dataLayerWsByQueryParams = new URLSearchParams(window.location.search).get('ws')
  const dataLayerWsByGlobalThis = ((globalThis as any).InspectorConfig?.dataLayerRpcWsUrl as string) || null

  return dataLayerWsByQueryParams || dataLayerWsByGlobalThis || null
}

// Function to create an event channel
function createSocketChannel(socket: WebSocket): EventChannel<WsActions> {
  return eventChannel((emit) => {
    socket.onclose = () => {
      console.log('closed ')
      emit(END)
    }
    socket.onerror = (error) => {
      emit({ type: 'WS_ERROR', error })
    }
    socket.onopen = () => {
      emit({ type: 'WS_OPENED' })
    }
    const unsubscribe = () => {
      socket.onmessage = null
    }
    return unsubscribe
  })
}

type WsActions =
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
    const dataLayer: DataLayerState['dataLayer'] = yield call(createLocalDataLayerRpcClient)
    yield put(connected({ dataLayer }))
    return
  }
  const ws = new WebSocket(wsUrl)
  const socketChannel: EventChannel<WsActions> = yield call(createSocketChannel, ws)
  try {
    while (true) {
      const wsEvent: WsActions = yield take(socketChannel)
      if (wsEvent.type === 'WS_OPENED') {
        const clientTransport = WebSocketTransport(ws)
        const client: RpcClient = yield call(() => createRpcClient(clientTransport))
        const clientPort: RpcClientPort = yield call(() => client.createPort('scene-ctx'))
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
