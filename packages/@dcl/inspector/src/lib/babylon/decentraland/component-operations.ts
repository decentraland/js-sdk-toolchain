import { ComponentDefinition } from '@dcl/ecs'
import { EcsEntity } from './EcsEntity'

export type ComponentOperation = <T>(ecsEntity: EcsEntity, component: ComponentDefinition<T>) => void
