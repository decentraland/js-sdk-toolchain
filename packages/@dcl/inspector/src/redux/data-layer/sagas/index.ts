import { takeEvery } from 'redux-saga/effects'

import {
  connect,
  connected,
  getInspectorPreferences,
  setInspectorPreferences,
  reconnect,
  save,
  getAssetCatalog,
  undo,
  redo,
  importAsset,
  removeAsset,
  getThumbnails,
  saveThumbnail
} from '..'
import { connectSaga } from './connect'
import { reconnectSaga } from './reconnect'
import { saveSaga } from './save'
import { getInspectorPreferencesSaga } from './get-inspector-preferences'
import { setInspectorPreferencesSaga } from './set-inspector-preferences'
import { getAssetCatalogSaga } from './get-asset-catalog'
import { redoSaga, undoSaga } from './undo-redo'
import { importAssetSaga } from './import-asset'
import { removeAssetSaga } from './remove-asset'
import { connectedSaga } from './connected'
import { getThumbnailsSaga } from './get-thumbnails'
import { saveThumbnailSaga } from './save-thumbnail'

export function* dataLayerSaga() {
  yield takeEvery(connect.type, connectSaga)
  yield takeEvery(reconnect.type, reconnectSaga)
  yield takeEvery(connected.type, connectedSaga)
  yield takeEvery(save.type, saveSaga)
  yield takeEvery(getInspectorPreferences.type, getInspectorPreferencesSaga)
  yield takeEvery(setInspectorPreferences.type, setInspectorPreferencesSaga)
  yield takeEvery(getAssetCatalog.type, getAssetCatalogSaga)
  yield takeEvery(undo.type, undoSaga)
  yield takeEvery(redo.type, redoSaga)
  yield takeEvery(importAsset.type, importAssetSaga)
  yield takeEvery(removeAsset.type, removeAssetSaga)
  yield takeEvery(getThumbnails.type, getThumbnailsSaga)
  yield takeEvery(saveThumbnail.type, saveThumbnailSaga)
}

export default dataLayerSaga
