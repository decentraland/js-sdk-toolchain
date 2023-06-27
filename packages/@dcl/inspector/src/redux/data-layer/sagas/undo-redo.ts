import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getAssetCatalog, getDataLayerInterface } from '..'
import { UndoRedoResponse } from '../../../lib/data-layer/remote-data-layer'
import { updateCanSave } from '../../app'

export function* undoSaga() {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const response: UndoRedoResponse = yield call(dataLayer.undo, {})

    // Re-fetch assets catalog
    if (response.type === 'file') {
      yield put(getAssetCatalog())
    }

    // Update dirty state
    yield put(updateCanSave({ dirty: true }))
  } catch (e) {
    yield put(error({ error: ErrorType.Undo }))
  }
}

export function* redoSaga() {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const response: UndoRedoResponse = yield call(dataLayer.redo, {})

    // Re-fetch assets catalog
    if (response.type === 'file') {
      yield put(getAssetCatalog())
    }

    // Update dirty state
    yield put(updateCanSave({ dirty: true }))
  } catch (e) {
    yield put(error({ error: ErrorType.Redo }))
  }
}
