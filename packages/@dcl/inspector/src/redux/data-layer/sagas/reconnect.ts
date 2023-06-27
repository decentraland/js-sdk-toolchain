import { put, select, delay } from 'redux-saga/effects'

import { ErrorType, connect, error, selectDataLayerReconnectAttempts } from '../'

const RECONNECT_TIMEOUT = 1000
export const MAX_RETRY_TIMES = 6

export function* reconnectSaga() {
  const reconnectAttempts: number = yield select(selectDataLayerReconnectAttempts)
  console.log(`[WS] Reconnecting for ${reconnectAttempts} time`)

  if (reconnectAttempts >= MAX_RETRY_TIMES) {
    yield put(error({ error: ErrorType.Disconnected }))
    return
  }
  yield delay(RECONNECT_TIMEOUT * reconnectAttempts)
  yield put(connect())
}
