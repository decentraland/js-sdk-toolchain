import { toJsonRpcRequest } from 'eth-connect'
import { test } from 'dcl-test-lib-integration'
import { Engine } from '@dcl/ecs'

const condition = (toJsonRpcRequest as any) === test()
// log(condition)
condition

const engine = Engine()
engine.addEntity()
