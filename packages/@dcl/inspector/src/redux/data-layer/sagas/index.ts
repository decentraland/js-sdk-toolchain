import { takeEvery } from 'redux-saga/effects'
import { connect, connected, getInspectorPreferences, setInspectorPreferences, reconnect, save } from '..'
import { connectSaga } from './connect'
import { reconnectSaga } from './reconnect'
import { saveSaga } from './save'
import { getInspectorPreferencesSaga } from './get-inspector-preferences'
import { setInspectorPreferencesSaga } from './set-inspector-preferences'

export function* dataLayerSaga() {
  yield takeEvery(connect.type, connectSaga)
  yield takeEvery(reconnect.type, reconnectSaga)
  yield takeEvery(save.type, saveSaga)
  yield takeEvery(getInspectorPreferences.type, getInspectorPreferencesSaga)
  yield takeEvery(setInspectorPreferences.type, setInspectorPreferencesSaga)
  yield takeEvery(connected.type, getInspectorPreferencesSaga)
}

export default dataLayerSaga
