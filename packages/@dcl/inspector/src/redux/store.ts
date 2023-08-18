import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import { MessageTransport } from '@dcl/mini-rpc'

import appStateReducer from './app'
import dataLayerReducer from './data-layer'
import sdkReducer from './sdk'
import uiReducer from './ui'
import { getParentUrl } from './data-layer/sagas/connect'
import { UiServer } from '../lib/rpc/ui/server'
import sagas from './root-saga'

const sagaMiddleware = createSagaMiddleware()

export const store = configureStore({
  reducer: {
    dataLayer: dataLayerReducer,
    sdk: sdkReducer,
    app: appStateReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware({ thunk: false, serializableCheck: false }).concat(sagaMiddleware)
  }
})

// if there is a parent, initialize rpc servers
const parentUrl = getParentUrl()
if (parentUrl) {
  const tranport = new MessageTransport(window, window.parent, parentUrl)
  new UiServer(tranport, store)
}

sagaMiddleware.run(sagas)

// global store
;(window as any).store = store

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
