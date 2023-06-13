import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'

import dataLayerReducer from './data-layer'
import sagas from './root-saga'

const sagaMiddleware = createSagaMiddleware()

export const store = configureStore({
  reducer: {
    dataLayer: dataLayerReducer
  },
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware({ thunk: false, serializableCheck: false }).concat(sagaMiddleware)
  }
})
sagaMiddleware.run(sagas)

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
