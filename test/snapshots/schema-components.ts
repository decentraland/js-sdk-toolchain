import { engine, Schemas } from '@dcl/sdk/ecs'
export * from '@dcl/sdk'

const String = engine.defineComponent('string', { value: Schemas.String })
const ent = engine.addEntity()
String.createOrReplace(ent, { value: 'hola' })
