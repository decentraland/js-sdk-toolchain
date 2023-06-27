import { call, select } from 'redux-saga/effects'

import { getEngines } from '..'
import { connectCrdtToEngine } from '../../../lib/sdk/connect-stream'
import { IDataLayer, getDataLayerInterface } from '../../data-layer'

export function* connectStream() {
  const engines: ReturnType<typeof getEngines> = yield select(getEngines)
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)

  if (!dataLayer || !engines.inspector || !engines.renderer) return

  yield call(connectCrdtToEngine, engines.inspector, dataLayer.crdtStream, 'Inspector')
  yield call(connectCrdtToEngine, engines.renderer, dataLayer.crdtStream, 'Renderer')
}
