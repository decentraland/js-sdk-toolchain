/* eslint-disable @typescript-eslint/ban-types */
import { expectSaga } from 'redux-saga-test-plan'
import reducer, { ErrorType, connect, error, initialState } from '..'

import { MAX_RETRY_TIMES, reconnectSaga } from './reconnect'
import { combineReducers } from '@reduxjs/toolkit'

describe('WebSocket Reconnection Saga', () => {
  it('Should try to reconnect', async () => {
    const provideDelay = ({ fn }, next) => (fn.name === 'delayP' ? null : next())

    return expectSaga(reconnectSaga)
      .withReducer(combineReducers({ dataLayer: reducer }))
      .withState({ dataLayer: initialState })
      .provide([{ call: provideDelay }])
      .put(connect())
      .hasFinalState({ dataLayer: { ...initialState, reconnectAttempts: 1 } })
      .run()
  })

  it('Should set error if max attemps reached', async () => {
    return expectSaga(reconnectSaga)
      .withReducer(combineReducers({ dataLayer: reducer }))
      .withState({ dataLayer: { ...initialState, reconnectAttempts: MAX_RETRY_TIMES } })
      .put(error({ error: ErrorType.Disconnected }))
      .hasFinalState({
        dataLayer: { ...initialState, reconnectAttempts: MAX_RETRY_TIMES, error: ErrorType.Disconnected }
      })
      .run()
  })
})
