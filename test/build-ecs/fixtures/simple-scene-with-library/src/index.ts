import { toJsonRpcRequest } from 'eth-connect'
import { test } from 'dcl-test-lib-integration'
import { engine } from '@dcl/ecs'

const condition = (toJsonRpcRequest as any) === test()
// log(condition)
condition

engine.addEntity()
