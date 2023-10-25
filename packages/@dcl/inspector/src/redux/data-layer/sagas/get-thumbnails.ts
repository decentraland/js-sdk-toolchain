import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getDataLayerInterface } from '..'
import { GetFilesResponse } from '../../../lib/data-layer/remote-data-layer'
import { updateThumbnails } from '../../app'
import { DIRECTORY } from '../../../lib/data-layer/host/fs-utils'

export function* getThumbnailsSaga() {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const thumbnails: GetFilesResponse = yield call(dataLayer.getFiles, { path: DIRECTORY.THUMBNAILS, ignore: [] })

    // Fetch asset catalog again
    yield put(updateThumbnails(thumbnails))
  } catch (e) {
    yield put(error({ error: ErrorType.GetThumbnails }))
  }
}
