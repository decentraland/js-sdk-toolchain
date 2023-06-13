import { put, select, delay } from 'redux-saga/effects'

import { connect, getDataLayerReconnectAttempts } from '../'

const RECONNECT_TIMEOUT = 1000
const MAX_RETRY_TIMES = 10

export function* reconnectSaga() {
  const reconnectAttempts: number = yield select(getDataLayerReconnectAttempts)
  console.log(`[WS] Reconnecting for ${reconnectAttempts} time`)

  // TODO: handle this error with a message to the user
  if (reconnectAttempts > MAX_RETRY_TIMES) {
    throw new Error('Max amount of retries. Socket disconnected')
  }

  yield delay(RECONNECT_TIMEOUT * reconnectAttempts)
  yield put(connect())
}
