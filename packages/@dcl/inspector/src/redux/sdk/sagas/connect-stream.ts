import { call, select } from 'redux-saga/effects'

import { getEngines } from '..'
import { connectCrdtToEngine } from '../../../lib/sdk/connect-stream'
import { getDataLayer } from '../../data-layer'

export function* connectStream() {
  const engines: ReturnType<typeof getEngines> = yield select(getEngines)
  const dataLayer: ReturnType<typeof getDataLayer> = yield select(getDataLayer)
  if (!dataLayer || !engines.inspector || !engines.renderer) return

  console.log('Data layer reconnected')
  yield call(connectCrdtToEngine, engines.inspector, dataLayer.crdtStream, 'Inspector')
  yield call(connectCrdtToEngine, engines.renderer, dataLayer.crdtStream, 'Renderer')
}
