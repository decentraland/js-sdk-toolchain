import { engine, Schemas } from '@dcl/sdk/ecs'
export * from '@dcl/sdk'

const String = engine.defineComponent({ value: Schemas.String }, 1331)
const ent = engine.addEntity()
String.createOrReplace(ent, { value: 'hola' })
