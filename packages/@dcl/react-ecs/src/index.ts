import { ReactEcs } from './react-ecs'
;(globalThis as any).ReactEcs = ReactEcs

export { ReactEcs }
export * from './components'
export * from './system'

export default ReactEcs
