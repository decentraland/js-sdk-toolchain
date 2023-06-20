import { takeEvery } from 'redux-saga/effects'
import { addEngines } from '../'
import { connected } from '../../data-layer'
import { connectStream } from './connect-stream'

export function* sdkSagas() {
  yield takeEvery(connected.type, connectStream)
  yield takeEvery(addEngines.type, connectStream)
}

export default sdkSagas
