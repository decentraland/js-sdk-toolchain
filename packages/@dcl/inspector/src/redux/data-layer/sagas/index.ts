import { takeEvery } from 'redux-saga/effects'
import { connect, reconnect } from '..'
import { connectSaga } from './connect'
import { reconnectSaga } from './reconnect'

export function* dataLayerSaga() {
  yield takeEvery(connect.type, connectSaga)
  yield takeEvery(reconnect.type, reconnectSaga)
}

export default dataLayerSaga
