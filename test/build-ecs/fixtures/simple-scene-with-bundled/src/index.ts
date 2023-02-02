import { toJsonRpcRequest } from 'eth-connect'
import { test } from 'dcl-test-lib-integration'
import { engine } from '@dcl/ecs'

const condition = toJsonRpcRequest('', []).method === test()
// log(condition)
condition

engine.addEntity()
