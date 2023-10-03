import { Entity, IEngine, Transform as TransformEngine, Name as NameEngine } from '@dcl/ecs'
import { ComponentName, getNextId } from '@dcl/asset-packs'
import { EditorComponentNames, EditorComponents, EditorComponentsTypes } from '../components'
import { pushChild } from '../nodes'

function isSelf(value: any) {
  return `${value}` === `{self}`
}

export function addChild(engine: IEngine) {
  return function addChild(parent: Entity, name: string, components?: Partial<Record<ComponentName, any>>): Entity {
    const child = engine.addEntity()
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const Name = engine.getComponent(NameEngine.componentId) as typeof NameEngine
    const Actions = engine.getComponent(EditorComponentNames.Actions) as EditorComponents['Actions']
    const Triggers = engine.getComponent(EditorComponentNames.Triggers) as EditorComponents['Triggers']
    const States = engine.getComponent(EditorComponentNames.States) as EditorComponents['States']

    // create new child components
    Name.create(child, { value: name })
    Transform.create(child, { parent })
    // update Nodes component
    Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parent, child) })
    if (components) {
      const getComponent = <T>(componentName: ComponentName) =>
        components[componentName] ? ({ ...components[componentName] } as T) : null

      // component values
      const actions = getComponent<EditorComponentsTypes['Actions']>(ComponentName.ACTIONS)
      const triggers = getComponent<EditorComponentsTypes['Triggers']>(ComponentName.TRIGGERS)
      const states = getComponent<EditorComponentsTypes['States']>(ComponentName.STATES)

      // assign component ids
      if (actions && isSelf(actions.id)) {
        actions.id = getNextId(engine as any)
      } else {
      }
      if (states && isSelf(states.id)) {
        states.id = getNextId(engine as any)
      }

      // map component ids
      const mapComponentId = (id: string | number | undefined) => {
        if (typeof id === 'string') {
          if (/{self:(.+)}/.test(id)) {
            const result = id.match(/{self:(.+)}/)
            if (result) {
              const componentName = result[1] as ComponentName
              switch (componentName) {
                case ComponentName.ACTIONS: {
                  if (actions) {
                    return actions.id
                  }
                  break
                }
                case ComponentName.STATES: {
                  if (states) {
                    return states.id
                  }
                  break
                }
              }
            }
          }
          return parseInt(id)
        }
        return id
      }

      // create components
      if (actions) {
        Actions.createOrReplace(child, actions)
      }
      if (triggers) {
        const updatedValue = triggers.value.map((trigger) => ({
          ...trigger,
          conditions: (trigger.conditions || []).map((condition) => ({
            ...condition,
            id: mapComponentId(condition.id)
          })),
          actions: trigger.actions.map((action) => ({
            ...action,
            id: mapComponentId(action.id)
          }))
        }))
        Triggers.createOrReplace(child, { ...triggers, value: updatedValue })
      }
      if (states) {
        States.createOrReplace(child, states)
      }
    }

    return child
  }
}

export default addChild
