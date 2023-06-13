import { all } from 'redux-saga/effects'
import { dataLayerSaga } from './data-layer/sagas'

export default function* rootSaga() {
  yield all([...dataLayerSaga()])
}
