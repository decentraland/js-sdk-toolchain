/* eslint-disable @typescript-eslint/ban-types */
import { expectSaga } from 'redux-saga-test-plan'
import { combineReducers } from '@reduxjs/toolkit'
import { Engine } from '@dcl/ecs'

import dataLayerReducer, { initialState as dataLayerState, getDataLayer } from '../../data-layer'
import sdkReducer, { getEngines, initialState as sdkState } from '../'
import { connectStream } from './connect-stream'
import * as connectStreamEngine from '../../../lib/sdk/connect-stream'

describe('SDK Engines crdt stream', () => {
  it('Should not connect  crdt stream if there is no ws', async () => {
    const spy = jest.spyOn(connectStreamEngine, 'connectCrdtToEngine')
    await expectSaga(connectStream)
      .withReducer(combineReducers({ dataLayer: dataLayerReducer, sdk: sdkReducer }))
      .withState({ dataLayer: dataLayerState, sdk: sdkState })
      .select(getEngines)
      .select(getDataLayer)
      .run()
    expect(spy).not.toBeCalled()
  })

  it('Should not connect  crdt stream if there is no ws', async () => {
    const spy = jest.spyOn(connectStreamEngine, 'connectCrdtToEngine').mockImplementation(() => {})
    const state = {
      dataLayer: {
        ...dataLayerState,
        dataLayer: jest.fn()
      },
      sdk: {
        inspectorEngine: Engine(),
        rendererEngine: Engine()
      }
    }
    await expectSaga(connectStream)
      .withReducer(combineReducers({ dataLayer: dataLayerReducer, sdk: sdkReducer }))
      .withState(state)
      .select(getEngines)
      .select(getDataLayer)
      .run()
    expect(spy).toBeCalledTimes(2)
  })
})
