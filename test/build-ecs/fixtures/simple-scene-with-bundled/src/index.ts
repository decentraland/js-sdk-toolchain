import { toJsonRpcRequest } from 'eth-connect'
import { test } from 'dcl-test-lib-integration'
import { Engine } from '@dcl/ecs'

const condition = toJsonRpcRequest('', []).method === test()
// log(condition)
condition

const engine = Engine()
engine.addEntity()
