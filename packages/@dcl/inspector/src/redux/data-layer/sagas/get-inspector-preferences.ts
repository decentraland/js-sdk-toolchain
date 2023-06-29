import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getDataLayerInterface } from '../'
import { updatePreferences } from '../../app'
import { InspectorPreferences } from '../../../lib/logic/preferences/types'

export function* getInspectorPreferencesSaga() {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const preferences: InspectorPreferences = yield call(dataLayer.getInspectorPreferences, {})
    yield put(updatePreferences({ preferences }))
  } catch (e) {
    yield put(error({ error: ErrorType.GetPreferences }))
  }
}
