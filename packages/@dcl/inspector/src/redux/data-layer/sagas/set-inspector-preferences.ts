import { call, put, select } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getDataLayerInterface, setInspectorPreferences } from '..'
import { updatePreferences, getInspectorPreferences } from '../../app'
import { InspectorPreferences } from '../../../lib/logic/preferences/types'

export function* setInspectorPreferencesSaga(action: ReturnType<typeof setInspectorPreferences>) {
  const values = action.payload
  const inspectorPreferences: InspectorPreferences = yield select(getInspectorPreferences)
  const newPreferences: InspectorPreferences = { ...inspectorPreferences, ...values }
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)

  if (!dataLayer) return

  try {
    yield call(dataLayer.setInspectorPreferences, newPreferences)
    yield put(updatePreferences({ preferences: newPreferences }))
  } catch (e) {
    yield put(error({ error: ErrorType.SetPreferences }))
  }
}
