import { Entity, IEngine, Transform as TransformEngine, Name as NameEngine } from '@dcl/ecs'
import { ComponentName } from '@dcl/asset-packs'
import { EditorComponentNames, EditorComponents, EditorComponentsTypes } from '../components'
import { pushChild } from '../nodes'

export function addChild(engine: IEngine) {
  return function addChild(parent: Entity, name: string, components?: Partial<Record<ComponentName, any>>): Entity {
    const child = engine.addEntity()
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const Name = engine.getComponent(NameEngine.componentId) as typeof NameEngine
    const Actions = engine.getComponent(EditorComponentNames.Actions) as EditorComponents['Actions']
    const Triggers = engine.getComponent(EditorComponentNames.Triggers) as EditorComponents['Triggers']
    const States = engine.getComponent(EditorComponentNames.States) as EditorComponents['States']
    const Tweens = engine.getComponent(EditorComponentNames.Tweens) as EditorComponents['Tweens']

    // create new child components
    Name.create(child, { value: name })
    Transform.create(child, { parent })
    // update Nodes component
    Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parent, child) })

    if (components && Object.values(components).length > 0) {
      for (const [name, component] of Object.entries(components)) {
        switch (name) {
          case ComponentName.ACTIONS: {
            Actions.createOrReplace(child, component as EditorComponentsTypes['Actions'])
            break
          }
          case ComponentName.TRIGGERS: {
            const triggers = component as EditorComponentsTypes['Triggers']
            const updatedValue = triggers.value.map((trigger) => ({
              ...trigger,
              conditions: (trigger.conditions || []).map((condition) => ({
                ...condition,
                entity: (condition.entity as any) === '{selfEntity}' ? child : condition.entity
              })),
              actions: trigger.actions.map((action) => ({
                ...action,
                entity: (action.entity as any) === '{selfEntity}' ? child : action.entity
              }))
            }))
            Triggers.createOrReplace(child, { ...triggers, value: updatedValue })
            break
          }
          case ComponentName.STATES: {
            States.createOrReplace(child, component as EditorComponentsTypes['States'])
            break
          }
          case ComponentName.TWEENS: {
            Tweens.createOrReplace(child, component as EditorComponentsTypes['Tweens'])
            break
          }
        }
      }
    }

    return child
  }
}

export default addChild
