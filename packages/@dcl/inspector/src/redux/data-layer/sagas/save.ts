import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getDataLayerInterface } from '../'
import { updateCanSave } from '../../app'

export function* saveSaga() {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    yield call(dataLayer.save, {})
    yield put(updateCanSave({ dirty: false }))
  } catch (e) {
    yield put(error({ error: ErrorType.Save }))
  }
}
