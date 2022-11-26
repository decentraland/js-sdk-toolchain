

import { toJsonRpcRequest } from 'eth-connect'
import { test } from 'dcl-test-lib-integration'
import { aaa } from 'rollup-demo-decentraland-lib'
import { Engine } from '@dcl/ecs'

const condition = toJsonRpcRequest === test()
// log(condition)
condition

const engine = Engine()
engine.addEntity()
aaa()
