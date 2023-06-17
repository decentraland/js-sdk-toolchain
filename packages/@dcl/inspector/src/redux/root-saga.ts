import { all } from 'redux-saga/effects'
import { dataLayerSaga } from './data-layer/sagas'
import { sdkSagas } from './sdk/sagas'

export default function* rootSaga() {
  yield all([...dataLayerSaga(), ...sdkSagas()])
}
